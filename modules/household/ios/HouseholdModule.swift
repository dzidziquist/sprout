import CloudKit
import ExpoModulesCore
import UIKit

/*
 * PlantFam's household sharing, the native half: a thin CloudKit bridge. All the deciding (what to send,
 * what wins, who did what) happens in JavaScript (src/engine/household.ts, src/lib/household.ts).
 *
 * One record zone, "Jungle", in the owner's private database, shared whole with a zone-wide CKShare.
 * Members reach the same zone through their shared database. Two record types:
 *   Item   kind (String), json (String), at (Int64)   a plant, a diary entry, the jungle's settings, a member
 *   Photo  file (Asset)                               a diary photo, named after its file
 * Record types must exist in the Production schema (CloudKit Console) before a TestFlight build can save.
 */

private let containerID = "iCloud.com.dzidziquist.plantfam"
private let zoneName = "Jungle"
private let inviteKey = "plantfam.pendingShareURL"
private let inviteNote = Notification.Name("PlantFamShareInvite")
private let changedNote = Notification.Name("PlantFamJungleChanged")
/// The silent push CloudKit sends when anything in the jungle changes (see HouseholdAppDelegate).
private let subscriptionID = "plantfam-jungle"


public class HouseholdModule: Module {
  private let container = CKContainer(identifier: containerID)
  private var sharingDelegate: SharingDelegate?
  private var observer: NSObjectProtocol?
  private var changeObserver: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("Household")

    Events("onInvite", "onChange")

    // Reading the jungle's changes needs iOS 16; the app runs on 15.1 and up, so older phones go without.
    Constants(["supported": HouseholdModule.supported])

    OnCreate {
      // The app delegate (plugins/withHousehold) keeps an accepted invite's link and posts this.
      self.observer = NotificationCenter.default.addObserver(forName: inviteNote, object: nil, queue: .main) { [weak self] _ in
        self?.sendEvent("onInvite", [:])
      }
      self.changeObserver = NotificationCenter.default.addObserver(forName: changedNote, object: nil, queue: .main) { [weak self] _ in
        self?.sendEvent("onChange", [:])
      }
    }

    OnDestroy {
      if let observer = self.observer { NotificationCenter.default.removeObserver(observer) }
      if let observer = self.changeObserver { NotificationCenter.default.removeObserver(observer) }
    }

    /// "available", "noAccount", "restricted", "temporarilyUnavailable" or "couldNotDetermine".
    AsyncFunction("accountStatus") { () async throws -> String in
      switch try await self.container.accountStatus() {
      case .available: return "available"
      case .noAccount: return "noAccount"
      case .restricted: return "restricted"
      case .temporarilyUnavailable: return "temporarilyUnavailable"
      default: return "couldNotDetermine"
      }
    }

    /// This iCloud user's id in the container: the same for everyone who sees them in the household.
    AsyncFunction("myId") { () async throws -> String in
      try await self.container.userRecordID().recordName
    }

    /// Creates the owner's Jungle zone if it isn't there yet.
    AsyncFunction("ensureZone") { () async throws in
      _ = try await self.container.privateCloudDatabase.modifyRecordZones(saving: [CKRecordZone(zoneID: self.zoneID(owner: nil))], deleting: [])
    }

    /// Saves items (overwriting what's there: JavaScript has already decided what wins) and deletes ids.
    AsyncFunction("save") { (owner: String?, items: [[String: Any]], deleteIds: [String]) async throws -> [String] in
      try await self.save(owner: owner, items: items, deleteIds: deleteIds)
    }

    /// Uploads one diary photo from the phone. A failed upload throws, so JavaScript tries again next round.
    AsyncFunction("savePhoto") { (owner: String?, name: String, fileUri: String) async throws in
      try await self.savePhoto(owner: owner, name: name, fileUri: fileUri)
    }

    /// What changed since `token` (see fetchChanges below). Needs iOS 16, like `supported`.
    AsyncFunction("fetchChanges") { (owner: String?, token: String?, diaryDir: String) async throws -> [String: Any] in
      guard #available(iOS 16, *) else { throw Exception(name: "NeedsiOS16", description: "Household sharing needs iOS 16 or later.") }
      return try await self.fetchChanges(owner: owner, token: token, diaryDir: diaryDir)
    }

    /// Owner: shows Apple's sharing sheet (Messages, Mail, a link…) for the whole jungle, creating the share the first time.
    AsyncFunction("invite") { (title: String) async throws in
      try await self.invite(title: title)
    }

    /// Everyone on the share: {id, name, owner, status ("accepted", "pending", "removed"), me}. Empty when not shared.
    AsyncFunction("people") { (owner: String?) async throws -> [[String: Any]] in
      try await self.people(owner: owner)
    }

    /// Owner: takes someone out of the household.
    AsyncFunction("remove") { (personId: String) async throws in
      try await self.remove(personId: personId)
    }

    /// Owner: ends the household. Deletes the shared zone from iCloud; every plant stays on this phone.
    AsyncFunction("stopSharing") { () async throws in
      _ = try await self.container.privateCloudDatabase.modifyRecordZones(saving: [], deleting: [self.zoneID(owner: nil)])
    }

    /// Member: leaves the household (the owner's jungle disappears from this iCloud account).
    AsyncFunction("leave") { (owner: String) async throws in
      _ = try await self.container.sharedCloudDatabase.modifyRecordZones(saving: [], deleting: [self.zoneID(owner: owner)])
    }

    /// The invite waiting to be answered, if any: {url, title, owner (zone owner id), ownerName}.
    AsyncFunction("pendingInvite") { () async throws -> [String: Any]? in
      try await self.pendingInvite()
    }

    /// Joins the household from the waiting invite. Gives back the zone owner's id.
    AsyncFunction("acceptInvite") { (link: String) async throws -> String in
      try await self.acceptInvite(link: link)
    }

    /// Asks CloudKit for a silent push whenever the jungle changes (the owner's private database, or the
    /// shared one for members), and registers this phone for it. Safe to call again.
    AsyncFunction("subscribe") { (owner: String?) async throws in
      try await self.subscribe(owner: owner)
    }

    /// Stops the pushes (leaving or ending the household).
    AsyncFunction("unsubscribe") { (owner: String?) async throws in
      _ = try await self.database(owner: owner).modifySubscriptions(saving: [], deleting: [subscriptionID])
    }

    /// A sync round finished: tells iOS the pushes that woke the app are handled.
    Function("changeHandled") { () -> Void in
      HouseholdPush.finish(.newData)
    }

    /// Says no to the waiting invite.
    Function("dismissInvite") { () -> Void in
      UserDefaults.standard.removeObject(forKey: inviteKey)
    }
  }

  // MARK: - Helpers

  private static var supported: Bool {
    if #available(iOS 16, *) { return true }
    return false
  }

  private func save(owner: String?, items: [[String: Any]], deleteIds: [String]) async throws -> [String] {
    let zone = zoneID(owner: owner)
    let records: [CKRecord] = items.compactMap { item -> CKRecord? in
      guard let id = item["id"] as? String, let kind = item["kind"] as? String, let json = item["json"] as? String else { return nil }
      let record = CKRecord(recordType: "Item", recordID: CKRecord.ID(recordName: id, zoneID: zone))
      record["kind"] = kind as CKRecordValue
      record["json"] = json as CKRecordValue
      record["at"] = NSNumber(value: (item["at"] as? NSNumber)?.int64Value ?? 0)
      return record
    }
    let deletes = deleteIds.map { CKRecord.ID(recordName: $0, zoneID: zone) }
    return try await modify(owner: owner, saving: records, deleting: deletes)
  }

  /*
   * What changed since `token`: items as {id, kind, json, at}, deleted ids, and photo names that are now
   * in Documents/diary. {reset: true} when the token is too old (start over without one), {gone: true}
   * when the zone is gone (the owner stopped sharing, or this member was removed or left).
   */
  @available(iOS 16, *)
  private func fetchChanges(owner: String?, token: String?, diaryDir: String) async throws -> [String: Any] {
    let db = database(owner: owner)
    let zone = zoneID(owner: owner)
    var since: CKServerChangeToken? = token.flatMap { decodeToken($0) }
    var items: [[String: Any]] = []
    var deleted: [String] = []
    var photos: [String] = []
    do {
      while true {
        let changes = try await db.recordZoneChanges(inZoneWith: zone, since: since)
        for (_, result) in changes.modificationResultsByID {
          guard case .success(let modification) = result else { continue }
          let record = modification.record
          if record.recordType == "Photo" {
            if let asset = record["file"] as? CKAsset, let from = asset.fileURL {
              let name = String(record.recordID.recordName.dropFirst(2))
              // Only a plain file name lands in the diary folder: nothing from iCloud can point elsewhere.
              guard isPlainFileName(name) else { continue }
              let to = URL(fileURLWithPath: diaryDir).appendingPathComponent(name)
              try? FileManager.default.createDirectory(atPath: diaryDir, withIntermediateDirectories: true)
              if !FileManager.default.fileExists(atPath: to.path) { try? FileManager.default.copyItem(at: from, to: to) }
              photos.append(name)
            }
            continue
          }
          guard record.recordType == "Item", let kind = record["kind"] as? String, let json = record["json"] as? String else { continue }
          let at: Double = (record["at"] as? NSNumber)?.doubleValue ?? 0
          items.append(["id": record.recordID.recordName, "kind": kind, "json": json, "at": at])
        }
        deleted += changes.deletions.filter { $0.recordType == "Item" }.map { $0.recordID.recordName }
        since = changes.changeToken
        if !changes.moreComing { break }
      }
    } catch let error as CKError where error.code == .changeTokenExpired {
      return ["reset": true]
    } catch let error as CKError where error.code == .zoneNotFound || error.code == .userDeletedZone {
      return ["gone": true]
    }
    let encoded: String? = since.flatMap { encodeToken($0) }
    return ["items": items, "deleted": deleted, "photos": photos, "token": encoded as Any]
  }

  private func invite(title: String) async throws {
    let db = container.privateCloudDatabase
    let shareID = CKRecord.ID(recordName: CKRecordNameZoneWideShare, zoneID: zoneID(owner: nil))
    let share: CKShare
    if let existing = (try? await db.record(for: shareID)) as? CKShare {
      share = existing
    } else {
      let fresh = CKShare(recordZoneID: zoneID(owner: nil))
      fresh[CKShare.SystemFieldKey.title] = title as CKRecordValue
      fresh.publicPermission = .none
      let saved = try await db.modifyRecords(saving: [fresh], deleting: [], savePolicy: .ifServerRecordUnchanged)
      guard case .success(let record)? = saved.saveResults[shareID], let made = record as? CKShare else {
        throw Exception(name: "ShareFailed", description: "Couldn’t set up sharing. Try again in a moment.")
      }
      share = made
    }
    try await presentSharing(share: share, title: title)
  }

  @MainActor
  private func presentSharing(share: CKShare, title: String) throws {
    guard let presenter = appContext?.utilities?.currentViewController() else {
      throw Exception(name: "NoScreen", description: "Couldn’t open the sharing sheet.")
    }
    let delegate = SharingDelegate(title: title)
    sharingDelegate = delegate
    let controller = UICloudSharingController(share: share, container: container)
    controller.availablePermissions = [.allowPrivate, .allowReadWrite]
    controller.delegate = delegate
    controller.popoverPresentationController?.sourceView = presenter.view
    presenter.present(controller, animated: true)
  }

  private func people(owner: String?) async throws -> [[String: Any]] {
    guard let share = try await self.share(owner: owner) else { return [] }
    let names = PersonNameComponentsFormatter()
    let me = share.currentUserParticipant
    return share.participants.map { p -> [String: Any] in
      let status: String
      switch p.acceptanceStatus {
      case .accepted: status = "accepted"
      case .pending: status = "pending"
      case .removed: status = "removed"
      default: status = "unknown"
      }
      let name: String = p.userIdentity.nameComponents.map { names.string(from: $0) } ?? ""
      let id: String = p.userIdentity.userRecordID?.recordName ?? ""
      let isOwner: Bool = p.role == .owner
      let isMe: Bool = me.map { $0 == p } ?? false
      return ["id": id, "name": name, "owner": isOwner, "status": status, "me": isMe]
    }
  }

  private func savePhoto(owner: String?, name: String, fileUri: String) async throws {
    guard let url = URL(string: fileUri), FileManager.default.fileExists(atPath: url.path) else { return }
    let record = CKRecord(recordType: "Photo", recordID: CKRecord.ID(recordName: "p-\(name)", zoneID: zoneID(owner: owner)))
    record["file"] = CKAsset(fileURL: url)
    let failed = try await modify(owner: owner, saving: [record], deleting: [])
    if !failed.isEmpty {
      throw Exception(name: "PhotoNotSaved", description: "Couldn’t send a photo to iCloud.")
    }
  }

  private func remove(personId: String) async throws {
    guard let share = try await self.share(owner: nil),
          let person = share.participants.first(where: { $0.userIdentity.userRecordID?.recordName == personId && $0.role != .owner }) else { return }
    share.removeParticipant(person)
    _ = try await modify(owner: nil, saving: [share], deleting: [])
  }

  private func pendingInvite() async throws -> [String: Any]? {
    guard let link = UserDefaults.standard.string(forKey: inviteKey), let url = URL(string: link) else { return nil }
    let metadata = try await container.shareMetadata(for: url)
    let names = PersonNameComponentsFormatter()
    let title: String = metadata.share[CKShare.SystemFieldKey.title] as? String ?? ""
    let owner: String = metadata.share.recordID.zoneID.ownerName
    let ownerName: String = metadata.ownerIdentity.nameComponents.map { names.string(from: $0) } ?? ""
    return ["url": link, "title": title, "owner": owner, "ownerName": ownerName]
  }

  private func acceptInvite(link: String) async throws -> String {
    guard let url = URL(string: link) else { throw Exception(name: "BadInvite", description: "That invite link doesn’t work.") }
    let metadata = try await container.shareMetadata(for: url)
    _ = try await container.accept(metadata)
    UserDefaults.standard.removeObject(forKey: inviteKey)
    return metadata.share.recordID.zoneID.ownerName
  }

  private func subscribe(owner: String?) async throws {
    let subscription = CKDatabaseSubscription(subscriptionID: subscriptionID)
    let info = CKSubscription.NotificationInfo()
    info.shouldSendContentAvailable = true
    subscription.notificationInfo = info
    _ = try await database(owner: owner).modifySubscriptions(saving: [subscription], deleting: [])
    await MainActor.run { UIApplication.shared.registerForRemoteNotifications() }
  }

  /// The Jungle zone: the owner's own (owner nil), or a member's view of someone else's.
  private func zoneID(owner: String?) -> CKRecordZone.ID {
    CKRecordZone.ID(zoneName: zoneName, ownerName: owner ?? CKCurrentUserDefaultName)
  }

  private func database(owner: String?) -> CKDatabase {
    owner == nil ? container.privateCloudDatabase : container.sharedCloudDatabase
  }

  /// Saves and deletes, overwriting the server's copy; gives back the ids that failed.
  private func modify(owner: String?, saving: [CKRecord], deleting: [CKRecord.ID]) async throws -> [String] {
    guard !saving.isEmpty || !deleting.isEmpty else { return [] }
    var failed: [String] = []
    // CloudKit takes up to 400 changes a request.
    var saves = saving[...]
    var deletes = deleting[...]
    while !saves.isEmpty || !deletes.isEmpty {
      let s = Array(saves.prefix(300))
      let d = Array(deletes.prefix(400 - s.count))
      saves = saves.dropFirst(s.count)
      deletes = deletes.dropFirst(d.count)
      let result = try await database(owner: owner).modifyRecords(saving: s, deleting: d, savePolicy: .allKeys, atomically: false)
      for (id, outcome) in result.saveResults { if case .failure = outcome { failed.append(id.recordName) } }
      for (id, outcome) in result.deleteResults {
        if case .failure(let error) = outcome, (error as? CKError)?.code != .unknownItem { failed.append(id.recordName) }
      }
    }
    return failed
  }

  private func share(owner: String?) async throws -> CKShare? {
    let id = CKRecord.ID(recordName: CKRecordNameZoneWideShare, zoneID: zoneID(owner: owner))
    do {
      return try await database(owner: owner).record(for: id) as? CKShare
    } catch let error as CKError where error.code == .unknownItem || error.code == .zoneNotFound {
      return nil
    }
  }

  private func encodeToken(_ token: CKServerChangeToken) -> String? {
    try? NSKeyedArchiver.archivedData(withRootObject: token, requiringSecureCoding: true).base64EncodedString()
  }

  private func decodeToken(_ text: String) -> CKServerChangeToken? {
    guard let data = Data(base64Encoded: text) else { return nil }
    return try? NSKeyedUnarchiver.unarchivedObject(ofClass: CKServerChangeToken.self, from: data)
  }
}

/// Takes CloudKit's silent "the jungle changed" pushes (registered in expo-module.config.json; Expo's
/// app delegate passes remote notifications on to subscribers like this one).
public class HouseholdAppDelegate: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didReceiveRemoteNotification userInfo: [AnyHashable: Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) {
    guard let note = CKNotification(fromRemoteNotificationDictionary: userInfo), note.subscriptionID == subscriptionID else {
      completionHandler(.noData)
      return
    }
    HouseholdPush.received(completionHandler)
  }
}

/// Pushes waiting for a sync to finish. iOS gives about 30 seconds; they're answered by then regardless.
enum HouseholdPush {
  private static var waiting: [(UIBackgroundFetchResult) -> Void] = []
  private static let lock = NSLock()

  static func received(_ done: @escaping (UIBackgroundFetchResult) -> Void) {
    lock.lock()
    waiting.append(done)
    lock.unlock()
    NotificationCenter.default.post(name: changedNote, object: nil)
    DispatchQueue.main.asyncAfter(deadline: .now() + 25) { finish(.newData) }
  }

  static func finish(_ result: UIBackgroundFetchResult) {
    lock.lock()
    let all = waiting
    waiting = []
    lock.unlock()
    all.forEach { $0(result) }
  }
}

/// A diary photo's name as the app makes them: no folders, no "..", nothing hidden.
private func isPlainFileName(_ name: String) -> Bool {
  !name.isEmpty && name.count <= 120 && !name.hasPrefix(".") && !name.contains("/") && !name.contains("\\") && name.range(of: "^[A-Za-z0-9._-]+$", options: .regularExpression) != nil
}

/// Apple's sharing sheet wants a delegate for its title and errors.
private class SharingDelegate: NSObject, UICloudSharingControllerDelegate {
  let title: String
  init(title: String) { self.title = title }

  func itemTitle(for csc: UICloudSharingController) -> String? { title }

  func cloudSharingController(_ csc: UICloudSharingController, failedToSaveShareWithError error: Error) {}
}
