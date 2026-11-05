import Foundation

public struct VerseRef: Codable, Hashable, Sendable {
    public var book: String
    public var chapter: Int
    public var verse: Int

    public init(book: String, chapter: Int, verse: Int) {
        self.book = book
        self.chapter = chapter
        self.verse = verse
    }
}

/// A selected piece of one verse. A selection across verses is several spans.
/// `range == nil` means the whole verse. Offsets count characters and belong
/// to `translationID`; `quote` lets the span be found in another translation
/// or a corrected text.
public struct VerseSpan: Codable, Hashable, Sendable {
    public var ref: VerseRef
    public var translationID: String
    public var start: Int?
    public var end: Int?
    public var quote: String

    public init(ref: VerseRef, translationID: String, start: Int? = nil, end: Int? = nil, quote: String = "") {
        self.ref = ref
        self.translationID = translationID
        self.start = start
        self.end = end
        self.quote = quote
    }

    public enum Resolution: Equatable, Sendable {
        case exact(Range<String.Index>)
        case relocated(Range<String.Index>)
        /// The words were not found, so the app marks the verse instead of dropping the mark.
        case wholeVerse
    }

    public func resolve(in text: String, translationID current: String) -> Resolution {
        guard let start, let end else { return .wholeVerse }
        if current == translationID, start >= 0, start < end, end <= text.count {
            let lower = text.index(text.startIndex, offsetBy: start)
            let upper = text.index(text.startIndex, offsetBy: end)
            if quote.isEmpty || text[lower..<upper] == quote { return .exact(lower..<upper) }
        }
        if !quote.isEmpty, let found = text.range(of: quote, options: [.caseInsensitive, .diacriticInsensitive]) {
            return .relocated(found)
        }
        return .wholeVerse
    }
}

public enum MarkScope: Codable, Hashable, Sendable {
    case bible
    case study(UUID)
}

public struct Mark: Codable, Hashable, Identifiable, Sendable {
    public var id: UUID
    public var scope: MarkScope
    public var spans: [VerseSpan]
    public var categoryKey: String
    public var note: String

    public init(id: UUID = UUID(), scope: MarkScope = .bible, spans: [VerseSpan], categoryKey: String, note: String = "") {
        self.id = id
        self.scope = scope
        self.spans = spans
        self.categoryKey = categoryKey
        self.note = note
    }
}

public enum ReadingLayer: Hashable, Sendable {
    case clean
    case personal
    case study(UUID)

    public func visible(_ marks: [Mark]) -> [Mark] {
        switch self {
        case .clean: []
        case .personal: marks.filter { $0.scope == .bible }
        case .study(let id): marks.filter { $0.scope == .study(id) }
        }
    }
}

/// Frozen copy of marks for one study. Later edits on either side stay separate.
public struct Snapshot: Codable, Hashable, Identifiable, Sendable {
    public var id: UUID
    public var createdAt: Date
    public private(set) var marks: [Mark]

    public init(id: UUID = UUID(), capturing source: [Mark], at date: Date) {
        self.id = id
        self.createdAt = date
        self.marks = source.map { Mark(scope: .study(id), spans: $0.spans, categoryKey: $0.categoryKey, note: $0.note) }
    }
}

public enum StudyText: Codable, Hashable, Sendable {
    case scripture([VerseSpan])
    case authored(String)

    public var isEmpty: Bool {
        switch self {
        case .scripture(let spans): spans.isEmpty
        case .authored(let text): text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
    }
}

public struct Step: Codable, Hashable, Identifiable, Sendable {
    public var id: UUID
    public var title: String
    public var baseText: StudyText?
    public var notes: String
    public var plannedSeconds: TimeInterval

    public init(id: UUID = UUID(), title: String, baseText: StudyText? = nil, notes: String = "", plannedSeconds: TimeInterval = 0) {
        self.id = id
        self.title = title
        self.baseText = baseText
        self.notes = notes
        self.plannedSeconds = plannedSeconds
    }

    public var hasBaseText: Bool { baseText.map { !$0.isEmpty } ?? false }
}

public struct Study: Codable, Hashable, Identifiable, Sendable {
    public var id: UUID
    public var title: String
    public var context: StudyText?
    public var snapshot: Snapshot?
    public var steps: [Step]

    public init(id: UUID = UUID(), title: String, context: StudyText? = nil, snapshot: Snapshot? = nil, steps: [Step] = []) {
        self.id = id
        self.title = title
        self.context = context
        self.snapshot = snapshot
        self.steps = steps
    }

    /// Drafts may have gaps; the Pulpit only opens with a base text on every step.
    public var stepsMissingBaseText: [Step] { steps.filter { !$0.hasBaseText } }
    public var isReadyForPulpit: Bool { !steps.isEmpty && stepsMissingBaseText.isEmpty }

    public var pulpitSections: [PulpitSection] {
        steps.map { PulpitSection(title: $0.title, plannedSeconds: $0.plannedSeconds) }
    }
}
