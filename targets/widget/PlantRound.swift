import SwiftUI
import WidgetKit

// The App Group the app writes to (src/lib/widget.ts) and the key it writes under.
private let appGroup = "group.com.dzidziquist.plantfam"
private let roundKey = "round"

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

/// One plant: its name and when its next check falls due.
struct RoundPlant: Decodable {
  let n: String
  let d: Date
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
  /// Names due by the end of this entry's day, soonest first.
  let due: [String]
  /// The next check after today, when nothing is due.
  let next: Date?
  /// End of a trip in progress.
  let away: Date?
  /// No plants shared yet (the app hasn't been opened since installing, or the jungle is empty).
  let empty: Bool
}

func entry(for day: Date, from data: RoundData?) -> RoundEntry {
  guard let data, !data.plants.isEmpty else {
    return RoundEntry(date: day, due: [], next: nil, away: nil, empty: true)
  }
  let calendar = Calendar.current
  let endOfDay = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: day))!
  // Away for this entry's moment (a trip can start at one of the midnights ahead): no round, just when you're back.
  if let trip = data.trips?.first(where: { $0.f <= day && day < $0.t }) {
    return RoundEntry(date: day, due: [], next: nil, away: trip.t, empty: false)
  }
  let sorted = data.plants.sorted { $0.d < $1.d }
  let due = sorted.filter { $0.d < endOfDay }.map(\.n)
  let next = sorted.first { $0.d >= endOfDay }?.d
  return RoundEntry(date: day, due: due, next: next, away: nil, empty: false)
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> RoundEntry {
    RoundEntry(date: Date(), due: ["Queenie", "Big Fig", "Cal", "Monty"], next: nil, away: nil, empty: false)
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

/// A plant from the app's art, standing clear of the widget's edge. Greyed in the tinted Home Screen look.
private struct PlantArt: View {
  @Environment(\.widgetRenderingMode) private var mode
  let name: String
  let height: CGFloat

  var body: some View {
    let image = Image(name).resizable()
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
    ZStack(alignment: .bottomTrailing) {
      PlantArt(name: art, height: 62)
        .padding(.trailing, 10)
        .padding(.bottom, 10)
      VStack(alignment: .leading, spacing: 0) {
        Eyebrow(text: "PLANT ROUND", color: c.muted)
        if !entry.due.isEmpty {
          Text("\(entry.due.count)").font(rounded(42)).foregroundStyle(c.ink).widgetAccentable()
          Text(entry.due.count == 1 ? "check today" : "checks today").font(rounded(13, .bold)).foregroundStyle(c.ink)
          Spacer(minLength: 4)
          Text("Next up").font(rounded(11, .bold)).foregroundStyle(c.muted)
          Text(entry.due[0]).font(rounded(13, .heavy)).foregroundStyle(c.ink).lineLimit(1)
            .frame(maxWidth: 82, alignment: .leading)
        } else {
          Text(headline).font(rounded(entry.empty ? 20 : 24)).foregroundStyle(c.ink).minimumScaleFactor(0.8).widgetAccentable()
            .padding(.top, 2)
          Text(subline).font(rounded(13, .bold)).foregroundStyle(c.ink)
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      .padding(14)
    }
  }

  private var art: String {
    if !entry.due.isEmpty { return "plantThirsty" }
    return entry.away != nil ? "plantSnoozing" : "plantHappy"
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
    ZStack(alignment: .bottomTrailing) {
      HStack(alignment: .bottom, spacing: 6) {
        PlantArt(name: entry.away != nil ? "plantSnoozing" : entry.due.isEmpty ? "plantHappy" : "plantThirsty", height: 62)
        PlantArt(name: "plantTomato", height: 58)
        PlantArt(name: "plantSnake", height: 62)
      }
      .padding(.trailing, 14)
      .padding(.bottom, 10)
      VStack(alignment: .leading, spacing: 4) {
        Eyebrow(text: "PLANT ROUND · \(weekday(entry.date))", color: c.muted)
        Text(title).font(rounded(22)).foregroundStyle(c.ink).widgetAccentable()
        if !entry.due.isEmpty {
          HStack(spacing: 5) {
            ForEach(Array(entry.due.prefix(3).enumerated()), id: \.offset) { item in
              Chip(text: item.element, palette: c)
            }
            if entry.due.count > 3 { Chip(text: "+\(entry.due.count - 3)", palette: c) }
          }
          .padding(.top, 2)
        } else if let line = subline {
          Text(line).font(rounded(13, .bold)).foregroundStyle(c.ink)
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      .padding(.horizontal, 16)
      .padding(.top, 14)
    }
  }

  private var title: String {
    if entry.empty { return "Add your first plant" }
    if entry.away != nil { return "Away · reminders paused" }
    if entry.due.isEmpty { return "All done for today" }
    return entry.due.count == 1 ? "1 check left" : "\(entry.due.count) checks left"
  }

  private var subline: String? {
    if entry.empty { return "Open PlantFam to start your jungle." }
    if let away = entry.away { return "Back \(shortDate(away)). Your streak is safe." }
    if let next = entry.next { return "Next check \(dayWord(next, from: entry.date))." }
    return nil
  }
}

/// A plant's name on a sticker pill.
private struct Chip: View {
  let text: String
  let palette: Palette
  var body: some View {
    Text(text)
      .font(rounded(12, .heavy))
      .foregroundStyle(palette.ink)
      .lineLimit(1)
      .padding(.horizontal, 8)
      .padding(.vertical, 3)
      .background(Capsule().fill(palette.chip))
      .overlay(Capsule().stroke(palette.chipEdge, lineWidth: 1.5))
      .frame(maxWidth: 110)
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
