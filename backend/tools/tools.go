//go:build tools

// このファイルは開発ツールの依存関係を記録するためのものです。
// ビルドには含まれません（//go:build tools）。
//
// 注意: 一部のツールは最新版がGo 1.24+を要求するため、
// go.mod での管理ではなく、Makefile/Dockerfile でバージョンを固定しています。
//
// ツール一覧:
//   - air v1.61.7 (ホットリロード)
//   - migrate v4.18.1 (DBマイグレーション)
//
// インストール: make tools

package tools
