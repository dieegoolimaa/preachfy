// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "PreachfyCore",
    platforms: [.iOS(.v18), .macOS(.v15)],
    products: [.library(name: "PreachfyCore", targets: ["PreachfyCore"])],
    targets: [
        .target(name: "PreachfyCore"),
        .testTarget(name: "PreachfyCoreTests", dependencies: ["PreachfyCore"]),
    ]
)
