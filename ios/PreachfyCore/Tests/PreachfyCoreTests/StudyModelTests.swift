import Foundation
import Testing
@testable import PreachfyCore

private let ref = VerseRef(book: "sl", chapter: 23, verse: 1)
private let verse = "O Senhor é o meu pastor; nada me faltará."
private let span = VerseSpan(ref: ref, translationID: "a", start: 13, end: 23, quote: "meu pastor")

@Test func wordSpanResolvesExactly() throws {
    guard case .exact(let range) = span.resolve(in: verse, translationID: "a") else { throw CocoaError(.coderInvalidValue) }
    #expect(verse[range] == "meu pastor")
}

@Test func wordSpanRelocatesInAnotherTranslation() throws {
    let other = "Javé é o meu pastor, de nada terei falta."
    guard case .relocated(let range) = span.resolve(in: other, translationID: "b") else { throw CocoaError(.coderInvalidValue) }
    #expect(other[range] == "meu pastor")
}

@Test func missingWordsFallBackToWholeVerse() {
    #expect(span.resolve(in: "The LORD is my shepherd", translationID: "kjv") == .wholeVerse)
}

@Test func layersSeparateMarks() {
    let personal = Mark(spans: [span], categoryKey: "promessa")
    let snapshot = Snapshot(capturing: [personal], at: Date(timeIntervalSince1970: 0))
    let all = [personal] + snapshot.marks
    #expect(ReadingLayer.clean.visible(all).isEmpty)
    #expect(ReadingLayer.personal.visible(all) == [personal])
    #expect(ReadingLayer.study(snapshot.id).visible(all) == snapshot.marks)
}

@Test func snapshotStaysFrozen() {
    var personal = Mark(spans: [span], categoryKey: "promessa", note: "original")
    let snapshot = Snapshot(capturing: [personal], at: Date(timeIntervalSince1970: 0))
    personal.note = "editada"
    #expect(snapshot.marks[0].note == "original")
    #expect(snapshot.marks[0].id != personal.id)
}

@Test func pulpitRequiresBaseTextOnEveryStep() {
    var study = Study(title: "Salmo 23", steps: [
        Step(title: "Ponto 1", baseText: .scripture([span])),
        Step(title: "Ponto 2", baseText: .authored("   ")),
    ])
    #expect(!study.isReadyForPulpit)
    #expect(study.stepsMissingBaseText.map(\.title) == ["Ponto 2"])
    study.steps[1].baseText = .authored("Ele está comigo")
    #expect(study.isReadyForPulpit)
    #expect(!Study(title: "Vazio").isReadyForPulpit)
}
