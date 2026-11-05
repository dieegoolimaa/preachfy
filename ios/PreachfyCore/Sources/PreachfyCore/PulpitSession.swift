import Foundation

public struct PulpitSection: Codable, Equatable, Sendable {
    public var title: String
    public var plannedSeconds: TimeInterval

    public init(title: String, plannedSeconds: TimeInterval) {
        self.title = title
        self.plannedSeconds = plannedSeconds
    }
}

public enum TimerState: Equatable, Sendable {
    case normal, warning, over
}

public enum Pace: Equatable, Sendable {
    case onPace
    case behind(TimeInterval)
    case ahead(TimeInterval)
}

/// Pulpit clock. Stores absolute dates instead of ticks, so it survives
/// a crash or relaunch once decoded.
public struct PulpitSession: Codable, Equatable, Sendable {
    public static let warningThreshold: TimeInterval = 300
    public static let paceTolerance: TimeInterval = 60

    public private(set) var sections: [PulpitSection]
    public private(set) var currentIndex = 0
    public private(set) var isPaused = false

    private var accumulated: TimeInterval = 0
    private var runningSince: Date?
    private var entryElapsed: [Int: TimeInterval] = [0: 0]
    private var spent: [Int: TimeInterval] = [:]
    private var sectionMark: TimeInterval = 0

    public init(sections: [PulpitSection], startedAt: Date) {
        precondition(!sections.isEmpty, "A session needs at least one section")
        self.sections = sections
        self.runningSince = startedAt
    }

    public var totalPlanned: TimeInterval {
        sections.reduce(0) { $0 + $1.plannedSeconds }
    }

    public func elapsed(at now: Date) -> TimeInterval {
        guard let runningSince else { return accumulated }
        return accumulated + max(0, now.timeIntervalSince(runningSince))
    }

    /// Negative once the planned time has passed; the app never interrupts.
    public func remaining(at now: Date) -> TimeInterval {
        totalPlanned - elapsed(at: now)
    }

    public func timerState(at now: Date) -> TimerState {
        let left = remaining(at: now)
        if left < 0 { return .over }
        return left <= Self.warningThreshold ? .warning : .normal
    }

    /// Compares when the current section began with when it was planned to begin.
    public var pace: Pace {
        let planned = sections[..<currentIndex].reduce(0) { $0 + $1.plannedSeconds }
        let delta = (entryElapsed[currentIndex] ?? 0) - planned
        if abs(delta) < Self.paceTolerance { return .onPace }
        return delta > 0 ? .behind(delta) : .ahead(-delta)
    }

    public func spentInSection(_ index: Int, at now: Date) -> TimeInterval {
        let stored = spent[index] ?? 0
        guard index == currentIndex else { return stored }
        return stored + max(0, elapsed(at: now) - sectionMark)
    }

    public mutating func pause(at now: Date) {
        guard !isPaused else { return }
        accumulated = elapsed(at: now)
        runningSince = nil
        isPaused = true
    }

    public mutating func resume(at now: Date) {
        guard isPaused else { return }
        runningSince = now
        isPaused = false
    }

    public mutating func go(to index: Int, at now: Date) {
        guard sections.indices.contains(index), index != currentIndex else { return }
        let time = elapsed(at: now)
        spent[currentIndex, default: 0] += time - sectionMark
        sectionMark = time
        currentIndex = index
        if entryElapsed[index] == nil { entryElapsed[index] = time }
    }
}
