package com.example.plugins

import io.ktor.server.application.*
import io.ktor.server.websocket.*
// import java.time.Duration // Видалено java.time.Duration
import kotlin.time.Duration.Companion.seconds // Додано для розширення .seconds

fun Application.configureSockets() {
    install(WebSockets) {
        pingPeriod = 15.seconds // Виправлено: використовуємо kotlin.time.Duration
        timeout = 15.seconds    // Виправлено: використовуємо kotlin.time.Duration
        maxFrameSize = Long.MAX_VALUE
        masking = false
    }
}