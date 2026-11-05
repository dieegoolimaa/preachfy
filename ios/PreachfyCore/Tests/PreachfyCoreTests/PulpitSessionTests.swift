import Foundation
import Testing
@testable import PreachfyCore

private let start = Date(timeIntervalSince1970: 1_000)
private func at(_ seconds: TimeInterval) -> Date { start.addingTimeInterval(seconds) }
private func session() -> PulpitSession {
    PulpitSession(sections: [
        .init(title: "Introdução", plannedSeconds: 300),
        .init(title: "Ponto 1", plannedSeconds: 600),
        .init(title: "Conclusão", plannedSeconds: 300),
    ], startedAt: start)
}

@Test func timerMovesFromNormalToWarningToOver() {
    let s = session()
    #expect(s.timerState(at: at(100)) == .normal)
    #expect(s.timerState(at: at(900)) == .warning)
    #expect(s.timerState(at: at(1_201)) == .over)
    #expect(s.remaining(at: at(1_210)) == -10)
}

@Test func pauseStopsTheClock() {
    var s = session()
    s.pause(at: at(60))
    #expect(s.elapsed(at: at(500)) == 60)
    s.resume(at: at(500))
    #expect(s.elapsed(at: at(510)) == 70)
}

@Test func paceComparesActualAndPlannedSectionStart() {
    var s = session()
    #expect(s.pace == .onPace)
    s.go(to: 1, at: at(420))
    #expect(s.pace == .behind(120))
    var early = session()
    early.go(to: 1, at: at(180))
    #expect(early.pace == .ahead(120))
}

@Test func revisitedSectionKeepsItsTimeAndFirstEntry() {
    var s = session()
    s.go(to: 1, at: at(300))
    s.go(to: 0, at: at(400))
    s.go(to: 1, at: at(450))
    #expect(s.spentInSection(0, at: at(450)) == 350)
    #expect(s.spentInSection(1, at: at(460)) == 110)
    #expect(s.pace == .onPace)
}

@Test func invalidNavigationIsIgnored() {
    var s = session()
    s.go(to: 9, at: at(10))
    #expect(s.currentIndex == 0)
}

@Test func clockSurvivesRelaunch() throws {
    var s = session()
    s.go(to: 1, at: at(300))
    let restored = try JSONDecoder().decode(PulpitSession.self, from: JSONEncoder().encode(s))
    #expect(restored == s)
    #expect(restored.elapsed(at: at(1_000)) == 1_000)
}
