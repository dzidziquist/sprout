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
      let zone = self.zoneID(owner: owner)
      let records: [CKRecord] = items.compactMap { item -> CKRecord? in
        guard let id = item["id"] as? String, let kind = item["kind"] as? String, let json = item["json"] as? String else { return nil }
        let record = CKRecord(recordType: "Item", recordID: CKRecord.ID(recordName: id, zoneID: zone))
        record["kind"] = kind as CKRecordValue
        record["json"] = json as CKRecordValue
        record["at"] = NSNumber(value: (item["at"] as? NSNumber)?.int64Value ?? 0)
        return record
      }
      let deletes = deleteIds.map { CKRecord.ID(recordName: $0, zoneID: zone) }
      return try await self.modify(owner: owner, saving: records, deleting: deletes)
    }

    /// Uploads one diary photo from the phone.
    AsyncFunction("savePhoto") { (owner: String?, name: String, fileUri: String) async throws in
      guard let url = URL(string: fileUri), FileManager.default.fileExists(atPath: url.path) else { return }
      let record = CKRecord(recordType: "Photo", recordID: CKRecord.ID(recordName: "p-\(name)", zoneID: self.zoneID(owner: owner)))
      record["file"] = CKAsset(fileURL: url)
      // A failed upload throws, so JavaScript doesn't count the photo as sent and tries again next round.
      if !(try await self.modify(owner: owner, saving: [record], deleting: [])).isEmpty {
        throw Exception(name: "PhotoNotSaved", description: "Couldn’t send a photo to iCloud.")
      }
    }

    /*
     * What changed since `token`: items as {id, kind, json, at}, deleted ids, and photo names that are now
     * in Documents/diary. {reset: true} when the token is too old (start over without one), {gone: true}
     * when the zone is gone (the owner stopped sharing, or this member was removed or left).
     */
    AsyncFunction("fetchChanges") { (owner: String?, token: String?, diaryDir: String) async throws -> [String: Any] in
      let db = self.database(owner: owner)
      let zone = self.zoneID(owner: owner)
      var since = token.flatMap(self.decodeToken)
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
            items.append(["id": record.recordID.recordName, "kind": kind, "json": json, "at": (record["at"] as? NSNumber)?.doubleValue ?? 0])
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
      return ["items": items, "deleted": deleted, "photos": photos, "token": since.flatMap(self.encodeToken) as Any]
    }

    /// Owner: shows Apple's sharing sheet (Messages, Mail, a link…) for the whole jungle, creating the share the first time.
    AsyncFunction("invite") { (title: String) async throws in
      let db = self.container.privateCloudDatabase
      let shareID = CKRecord.ID(recordName: CKRecordNameZoneWideShare, zoneID: self.zoneID(owner: nil))
      let share: CKShare
      if let existing = try? await db.record(for: shareID) as? CKShare {
        share = existing
      } else {
        let fresh = CKShare(recordZoneID: self.zoneID(owner: nil))
        fresh[CKShare.SystemFieldKey.title] = title as CKRecordValue
        fresh.publicPermission = .none
        let saved = try await db.modifyRecords(saving: [fresh], deleting: [], savePolicy: .ifServerRecordUnchanged)
        guard case .success(let record)? = saved.saveResults[shareID], let made = record as? CKShare else {
          throw Exception(name: "ShareFailed", description: "Couldn’t set up sharing. Try again in a moment.")
        }
        share = made
      }
      try await MainActor.run {
        guard let presenter = self.appContext?.utilities?.currentViewController() else {
          throw Exception(name: "NoScreen", description: "Couldn’t open the sharing sheet.")
        }
        let delegate = SharingDelegate(title: title)
        self.sharingDelegate = delegate
        let controller = UICloudSharingController(share: share, container: self.container)
        controller.availablePermissions = [.allowPrivate, .allowReadWrite]
        controller.delegate = delegate
        controller.popoverPresentationController?.sourceView = presenter.view
        presenter.present(controller, animated: true)
      }
    }

    /// Everyone on the share: {id, name, owner, status ("accepted", "pending", "removed"), me}. Empty when not shared.
    AsyncFunction("people") { (owner: String?) async throws -> [[String: Any]] in
      guard let share = try await self.share(owner: owner) else { return [] }
      let names = PersonNameComponentsFormatter()
      return share.participants.map { p -> [String: Any] in
        let status: String
        switch p.acceptanceStatus {
        case .accepted: status = "accepted"
        case .pending: status = "pending"
        case .removed: status = "removed"
        default: status = "unknown"
        }
        return [
          "id": p.userIdentity.userRecordID?.recordName ?? "",
          "name": p.userIdentity.nameComponents.map { names.string(from: $0) } ?? "",
          "owner": p.role == .owner,
          "status": status,
          "me": p == share.currentUserParticipant,
        ]
      }
    }

    /// Owner: takes someone out of the household.
    AsyncFunction("remove") { (personId: String) async throws in
      guard let share = try await self.share(owner: nil),
            let person = share.participants.first(where: { $0.userIdentity.userRecordID?.recordName == personId && $0.role != .owner }) else { return }
      share.removeParticipant(person)
      _ = try await self.modify(owner: nil, saving: [share], deleting: [])
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
      guard let link = UserDefaults.standard.string(forKey: inviteKey), let url = URL(string: link) else { return nil }
      let metadata = try await self.container.shareMetadata(for: url, shouldFetchRootRecord: false)
      let names = PersonNameComponentsFormatter()
      return [
        "url": link,
        "title": metadata.share[CKShare.SystemFieldKey.title] as? String ?? "",
        "owner": metadata.share.recordID.zoneID.ownerName,
        "ownerName": metadata.ownerIdentity.nameComponents.map { names.string(from: $0) } ?? "",
      ]
    }

    /// Joins the household from the waiting invite. Gives back the zone owner's id.
    AsyncFunction("acceptInvite") { (link: String) async throws -> String in
      guard let url = URL(string: link) else { throw Exception(name: "BadInvite", description: "That invite link doesn’t work.") }
      let metadata = try await self.container.shareMetadata(for: url, shouldFetchRootRecord: false)
      _ = try await self.container.accept(metadata)
      UserDefaults.standard.removeObject(forKey: inviteKey)
      return metadata.share.recordID.zoneID.ownerName
    }

    /// Asks CloudKit for a silent push whenever the jungle changes (the owner's private database, or the
    /// shared one for members), and registers this phone for it. Safe to call again.
    AsyncFunction("subscribe") { (owner: String?) async throws in
      let subscription = CKDatabaseSubscription(subscriptionID: subscriptionID)
      let info = CKSubscription.NotificationInfo()
      info.shouldSendContentAvailable = true
      subscription.notificationInfo = info
      _ = try await self.database(owner: owner).modifySubscriptions(saving: [subscription], deleting: [])
      await MainActor.run { UIApplication.shared.registerForRemoteNotifications() }
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
