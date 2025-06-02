package com.example.plugins

import com.example.model.* // Переконайтеся, що всі класи моделі імпортовані
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.plugins.contentnegotiation.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.modules.SerializersModule
import kotlinx.serialization.modules.polymorphic
import kotlinx.serialization.modules.subclass

// Визначаємо модуль серіалізації на рівні пакета для спільного доступу
val appJsonSerializersModule = SerializersModule {
    polymorphic(Instrument::class) {
        subclass(GaugeInstrument::class)
        subclass(DigitalDisplayInstrument::class)
        subclass(WarningPanelInstrument::class)
    }
    polymorphic(WebSocketMessage::class) {
        subclass(WebSocketMessage.ValueUpdate::class)
        subclass(WebSocketMessage.FullState::class)
    }
}

fun Application.configureSerialization() {
    install(ContentNegotiation) {
        json(Json {
            prettyPrint = true
            isLenient = true
            ignoreUnknownKeys = true
            classDiscriminator = "instrumentClass" // Цей дискримінатор буде використовуватися для поліморфних типів
            serializersModule = appJsonSerializersModule // Використовуємо спільний модуль
            encodeDefaults = true
        })
    }
}