package com.example.plugins

import com.example.routing.instrumentRoutes
import com.example.routing.webSocketRoutes
import com.example.service.InstrumentService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.response.*
import io.ktor.server.routing.*


fun Application.configureRouting(instrumentService: InstrumentService) {
    install(StatusPages) {
        exception<Throwable> { call, cause ->
            // Log the error
            // Виправлено: використовуємо call.application.log
            call.application.log.error("Unhandled error: ${cause.localizedMessage}", cause)
            call.respondText(text = "500: ${cause.localizedMessage}" , status = HttpStatusCode.InternalServerError) // Краще показувати localizedMessage
        }
        status(HttpStatusCode.NotFound) { call, status ->
            call.respondText(text = "404: Page Not Found", status = status)
        }
    }
    routing {
        instrumentRoutes(instrumentService)
        webSocketRoutes(instrumentService)
    }
}