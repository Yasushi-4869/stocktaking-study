package config

import "os"

// Config はアプリケーションの設定を保持する
type Config struct {
	DatabaseURL string
	JWTSecret   string
	Port        string
}

// Load は環境変数から設定を読み込む
func Load() *Config {
	return &Config{
		DatabaseURL: getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/inventory?sslmode=disable"),
		JWTSecret:   getEnv("JWT_SECRET", "dev-secret-key"),
		Port:        getEnv("PORT", "8080"),
	}
}

// getEnv は環境変数を取得し、存在しない場合はデフォルト値を返す
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
