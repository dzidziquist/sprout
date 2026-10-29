import SwiftUI
import WidgetKit

// The App Group the app writes to (src/lib/widget.ts) and the key it writes under.
private let appGroup = "group.com.dzidziquist.plantfam"
private let roundKey = "round"
/// Where the app leaves each plant's cartoons (src/lib/widgetPayload.ts WIDGET_ART_DIR).
private let artFolder = "widget-art-1"

/// PlantFam's colours, in the Home Screen's light and dark looks (dark is the navy of the dark app icon).
private struct Palette {
  let ink: Color
  let muted: Color
  let due: Color
  let done: Color
  let calm: Color
  let chip: Color
  let chipEdge: Color

  static func of(_ scheme: ColorScheme) -> Palette {
    scheme == .dark
      ? Palette(
        ink: Color(red: 0.95, green: 0.95, blue: 0.97),
        muted: Color(red: 0.70, green: 0.72, blue: 0.82),
        due: Color(red: 0.06, green: 0.11, blue: 0.29),
        done: Color(red: 0.05, green: 0.16, blue: 0.20),
        calm: Color(red: 0.06, green: 0.12, blue: 0.28),
        chip: Color(red: 0.14, green: 0.19, blue: 0.38),
        chipEdge: Color(red: 0.95, green: 0.95, blue: 0.97).opacity(0.35))
      : Palette(
        ink: Color(red: 27 / 255, green: 27 / 255, blue: 47 / 255),
        muted: Color(red: 85 / 255, green: 85 / 255, blue: 107 / 255),
        due: Color(red: 1.0, green: 0.95, blue: 0.80),
        done: Color(red: 215 / 255, green: 249 / 255, blue: 228 / 255),
        calm: Color(red: 214 / 255, green: 238 / 255, blue: 255 / 255),
        chip: .white,
        chipEdge: Color(red: 27 / 255, green: 27 / 255, blue: 47 / 255))
  }
}

// MARK: - Data from the app

/// One plant: its name, when its next check falls due, when it was last checked, and its cartoon (`a`, the
/// name the app files its pictures under in the App Group).
struct RoundPlant: Decodable {
  let n: String
  let d: Date
  let l: Date?
  let a: String?
}

/// A trip from away mode: from `f` until `t`.
struct RoundTrip: Decodable {
  let f: Date
  let t: Date
}

/// What the app shares: every plant on the round, and every trip that isn't over yet.
struct RoundData: Decodable {
  let plants: [RoundPlant]
  let trips: [RoundTrip]?
  /// No worried faces: the app's gentle (or face-free) look.
  let g: Bool?
}

private func parseDate(_ text: String) -> Date? {
  let iso = ISO8601DateFormatter()
  iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  if let date = iso.date(from: text) { return date }
  iso.formatOptions = [.withInternetDateTime]
  return iso.date(from: text)
}

func loadRound() -> RoundData? {
  guard let text = UserDefaults(suiteName: appGroup)?.string(forKey: roundKey), let json = text.data(using: .utf8) else { return nil }
  let decoder = JSONDecoder()
  decoder.dateDecodingStrategy = .custom { decoder in
    let container = try decoder.singleValueContainer()
    let text = try container.decode(String.self)
    guard let date = parseDate(text) else {
      throw DecodingError.dataCorruptedError(in: container, debugDescription: "Not an ISO date: \(text)")
    }
    return date
  }
  return try? decoder.decode(RoundData.self, from: json)
}

// MARK: - Timeline

struct RoundEntry: TimelineEntry {
  let date: Date
  /// Plants due by the end of this entry's day, soonest first.
  let due: [RoundPlant]
  /// The next few plants after today, soonest first: the shelf once the round is done, or while away.
  let later: [RoundPlant]
  /// The next check after today, when nothing is due.
  let next: Date?
  /// End of a trip in progress.
  let away: Date?
  /// No plants shared yet (the app hasn't been opened since installing, or the jungle is empty).
  let empty: Bool
  /// No worried faces.
  let gentle: Bool

  /// How plants on the shelf look: thirsty when due (happy in the gentle look), happy when done, asleep while away.
  var mood: Mood { away != nil ? .snoozing : due.isEmpty || gentle ? .happy : .thirsty }
}

func entry(for day: Date, from data: RoundData?) -> RoundEntry {
  guard let data, !data.plants.isEmpty else {
    return RoundEntry(date: day, due: [], later: [], next: nil, away: nil, empty: true, gentle: false)
  }
  let calendar = Calendar.current
  let endOfDay = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: day))!
  let gentle = data.g ?? false
  let sorted = data.plants.sorted { $0.d < $1.d }
  // Away for this entry's moment (a trip can start at one of the midnights ahead): no round, just when you're back.
  if let trip = data.trips?.first(where: { $0.f <= day && day < $0.t }) {
    return RoundEntry(date: day, due: [], later: Array(sorted.prefix(3)), next: nil, away: trip.t, empty: false, gentle: gentle)
  }
  let due = sorted.filter { $0.d < endOfDay }
  let later = sorted.filter { $0.d >= endOfDay }
  return RoundEntry(date: day, due: due, later: Array(later.prefix(3)), next: later.first?.d, away: nil, empty: false, gentle: gentle)
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> RoundEntry {
    let sample = ["Queenie", "Big Fig", "Cal", "Monty"].map { RoundPlant(n: $0, d: Date(), l: nil, a: nil) }
    return RoundEntry(date: Date(), due: sample, later: [], next: nil, away: nil, empty: false, gentle: false)
  }

  func getSnapshot(in context: Context, completion: @escaping (RoundEntry) -> Void) {
    let data = loadRound()
    completion(context.isPreview && data == nil ? placeholder(in: context) : entry(for: Date(), from: data))
  }

  /// Now, then each of the next midnights, so the widget rolls over to the new day's round by itself.
  /// The app reloads it whenever plants change.
  func getTimeline(in context: Context, completion: @escaping (Timeline<RoundEntry>) -> Void) {
    let data = loadRound()
    let calendar = Calendar.current
    let now = Date()
    let midnights = (1...3).compactMap { calendar.date(byAdding: .day, value: $0, to: calendar.startOfDay(for: now)) }
    let entries = [entry(for: now, from: data)] + midnights.map { entry(for: $0, from: data) }
    completion(Timeline(entries: entries, policy: .after(midnights.last!)))
  }
}

// MARK: - Words

private func dayWord(_ date: Date, from now: Date) -> String {
  let calendar = Calendar.current
  let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: now), to: calendar.startOfDay(for: date)).day ?? 0
  if days <= 1 { return "tomorrow" }
  if days < 7 {
    let formatter = DateFormatter()
    formatter.dateFormat = "EEEE"
    return formatter.string(from: date)
  }
  let formatter = DateFormatter()
  formatter.dateFormat = "MMM d"
  return formatter.string(from: date)
}

private func daysBetween(_ from: Date, _ to: Date) -> Int {
  let calendar = Calendar.current
  return calendar.dateComponents([.day], from: calendar.startOfDay(for: from), to: calendar.startOfDay(for: to)).day ?? 0
}

/// "today", "yesterday", "7 days ago".
private func ago(_ date: Date, from now: Date) -> String {
  let days = daysBetween(date, now)
  if days <= 0 { return "today" }
  if days == 1 { return "yesterday" }
  return "\(days) days ago"
}

private func shortDate(_ date: Date) -> String {
  let formatter = DateFormatter()
  formatter.dateFormat = "MMM d"
  return formatter.string(from: date)
}

private func weekday(_ date: Date) -> String {
  let formatter = DateFormatter()
  formatter.dateFormat = "EEE"
  return formatter.string(from: date).uppercased()
}

private func rounded(_ size: CGFloat, _ weight: Font.Weight = .heavy) -> Font {
  .system(size: size, weight: weight, design: .rounded)
}

// MARK: - Views

enum Mood: String {
  case happy, thirsty, snoozing

  /// The Monstera bundled with the widget, for a plant whose own picture isn't in the App Group yet.
  var standIn: String {
    switch self {
    case .happy: return "plantHappy"
    case .thirsty: return "plantThirsty"
    case .snoozing: return "plantSnoozing"
    }
  }
}

/// A plant's own cartoon in a mood, as the app left it in the App Group (src/lib/widget.ts); nil until it's there.
private func plantImage(_ key: String?, _ mood: Mood) -> UIImage? {
  guard let key,
    let url = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup)?
      .appendingPathComponent("\(artFolder)/\(key)-\(mood.rawValue).png"),
    let image = UIImage(contentsOfFile: url.path)
  else { return nil }
  // Decoded at widget size, not the app's 640 px: widgets have little memory to spare.
  let scale = 220 / max(image.size.width, image.size.height, 1)
  return image.preparingThumbnail(of: CGSize(width: image.size.width * scale, height: image.size.height * scale)) ?? image
}

/// A plant's cartoon (with its own see-through margin), or the bundled stand-in. Greyed in the tinted Home Screen look.
private struct PlantArt: View {
  @Environment(\.widgetRenderingMode) private var mode
  let key: String?
  let mood: Mood
  let height: CGFloat

  var body: some View {
    let image = (plantImage(key, mood).map { Image(uiImage: $0) } ?? Image(mood.standIn)).resizable()
    Group {
      if #available(iOS 18.0, *) {
        image.widgetAccentedRenderingMode(.desaturated)
      } else {
        image
      }
    }
    .scaledToFit()
    .frame(height: height)
    .opacity(mode == .accented ? 0.6 : 1)
    .accessibilityHidden(true)
  }
}

/// "PLANT ROUND" over everything, in the app's small-caps eyebrow style.
private struct Eyebrow: View {
  let text: String
  let color: Color
  var body: some View {
    Text(text).tracking(0.3).font(rounded(11, .bold)).foregroundStyle(color)
  }
}

struct SmallView: View {
  @Environment(\.colorScheme) private var scheme
  let entry: RoundEntry

  var body: some View {
    let c = Palette.of(scheme)
    if let first = entry.due.first {
      // Due: the count with the first plant's face beside it, its full name across the bottom.
      VStack(alignment: .leading, spacing: 0) {
        Eyebrow(text: "PLANT ROUND", color: c.muted)
        HStack(alignment: .top, spacing: 0) {
          VStack(alignment: .leading, spacing: 0) {
            Text("\(entry.due.count)").font(rounded(42)).foregroundStyle(c.ink).widgetAccentable()
            Text(entry.due.count == 1 ? "check today" : "checks today").font(rounded(13, .bold)).foregroundStyle(c.ink)
          }
          Spacer(minLength: 0)
          PlantArt(key: first.a, mood: entry.mood, height: 80).padding(.top, -10).padding(.trailing, -6)
        }
        Spacer(minLength: 2)
        Text("Next up").font(rounded(11, .bold)).foregroundStyle(c.muted)
        Text(first.n).font(rounded(14, .heavy)).foregroundStyle(c.ink).lineLimit(2).minimumScaleFactor(0.85)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      .padding(14)
    } else {
      ZStack(alignment: .bottomTrailing) {
        PlantArt(key: entry.later.first?.a, mood: entry.mood, height: 80)
          .padding(.trailing, 4)
          .padding(.bottom, 2)
        VStack(alignment: .leading, spacing: 0) {
          Eyebrow(text: "PLANT ROUND", color: c.muted)
          Text(headline).font(rounded(entry.empty ? 20 : 24)).foregroundStyle(c.ink).minimumScaleFactor(0.8).widgetAccentable()
            .padding(.top, 2)
          Text(subline).font(rounded(13, .bold)).foregroundStyle(c.ink)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(14)
      }
    }
  }

  private var headline: String {
    if entry.empty { return "Add a plant" }
    if entry.away != nil { return "Away" }
    return "All done"
  }

  private var subline: String {
    if entry.empty { return "Open PlantFam\nto start" }
    if let away = entry.away { return "Back \(shortDate(away))" }
    if let next = entry.next { return "Next check\n\(dayWord(next, from: entry.date))" }
    return "Nothing due"
  }
}

struct MediumView: View {
  @Environment(\.colorScheme) private var scheme
  let entry: RoundEntry

  var body: some View {
    let c = Palette.of(scheme)
    VStack(alignment: .leading, spacing: 0) {
      Eyebrow(text: "PLANT ROUND · \(weekday(entry.date))", color: c.muted)
      Text(title).font(rounded(22)).foregroundStyle(c.ink).lineLimit(1).minimumScaleFactor(0.8).widgetAccentable()
      if let text = line {
        Text(text).font(rounded(13, .bold)).foregroundStyle(c.ink).lineLimit(1).minimumScaleFactor(0.85).padding(.top, 1)
      }
      Spacer(minLength: 0)
      // A shelf: each plant's face over its name (due ones first), then how many more.
      HStack(alignment: .bottom, spacing: 6) {
        if shelf.isEmpty {
          PlantArt(key: nil, mood: .happy, height: 66)
        }
        ForEach(Array(shelf.enumerated()), id: \.offset) { item in
          VStack(spacing: -6) {
            PlantArt(key: item.element.a, mood: entry.mood, height: 66)
            Text(item.element.n).font(rounded(12, .heavy)).foregroundStyle(c.ink).lineLimit(1)
          }
          .frame(width: 92)
        }
        if more > 0 {
          Text("+\(more)")
            .font(rounded(13, .heavy))
            .foregroundStyle(c.ink)
            .frame(width: 34, height: 34)
            .background(Circle().fill(c.chip))
            .overlay(Circle().stroke(c.chipEdge, lineWidth: 1.5))
            .padding(.bottom, 18)
        }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .padding(.horizontal, 16)
    .padding(.top, 14)
    .padding(.bottom, 10)
  }

  private var shelf: [RoundPlant] { entry.due.isEmpty ? entry.later : Array(entry.due.prefix(3)) }
  private var more: Int { max(entry.due.count - 3, 0) }

  private var title: String {
    if entry.empty { return "Add your first plant" }
    if entry.away != nil { return "Away · reminders paused" }
    if entry.due.isEmpty { return "All done for today" }
    return entry.due.count == 1 ? "1 check left" : "\(entry.due.count) checks left"
  }

  /// Under the title: why the round matters today, or when it's next.
  private var line: String? {
    if entry.empty { return "Open PlantFam to start your jungle." }
    if let away = entry.away { return "Back \(shortDate(away)). Your streak is safe." }
    if entry.due.isEmpty { return entry.next.map { "Next check \(dayWord($0, from: entry.date))." } }
    if entry.due.count == 1 {
      guard let last = entry.due[0].l else { return "First check. How’s the soil?" }
      return "Last checked \(ago(last, from: entry.date)). How’s the soil?"
    }
    let checked = entry.due.compactMap { p in p.l.map { (p.n, $0) } }
    guard let longest = checked.min(by: { $0.1 < $1.1 }) else { return "Feel the soil, then tap what you found." }
    let days = max(daysBetween(longest.1, entry.date), 1)
    return "\(longest.0) waited longest: \(days) \(days == 1 ? "day" : "days")."
  }
}

struct RoundView: View {
  @Environment(\.widgetFamily) private var family
  @Environment(\.colorScheme) private var scheme
  let entry: RoundEntry

  var body: some View {
    let c = Palette.of(scheme)
    Group {
      if family == .systemMedium { MediumView(entry: entry) } else { SmallView(entry: entry) }
    }
    .widgetURL(URL(string: "plantfam:///"))
    // A plain colour: iOS draws the widget's own rounded edge, and swaps it out in the tinted look.
    .containerBackground(for: .widget) { entry.empty || entry.away != nil ? c.calm : entry.due.isEmpty ? c.done : c.due }
    .accessibilityElement(children: .combine)
  }
}

// MARK: - Widget

struct PlantRoundWidget: Widget {
  let kind = "PlantRound"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      RoundView(entry: entry)
    }
    .configurationDisplayName("Plant round")
    .description("Who needs a check today. Tap to open your round.")
    .supportedFamilies([.systemSmall, .systemMedium])
    .contentMarginsDisabled()
  }
}

@main
struct PlantFamWidgets: WidgetBundle {
  var body: some Widget {
    PlantRoundWidget()
  }
}
