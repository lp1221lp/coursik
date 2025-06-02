package com.example.routing

import com.example.model.InstrumentValueUpdate
import com.example.model.WebSocketMessage
import com.example.plugins.appJsonSerializersModule
import com.example.service.InstrumentService
import io.ktor.server.application.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import kotlinx.coroutines.flow.collectLatest
import kotlinx.serialization.ExperimentalSerializationApi // Поки залишимо, якщо десь знадобиться
import kotlinx.serialization.json.Json

@OptIn(ExperimentalSerializationApi::class) // Поки залишимо
fun Route.webSocketRoutes(instrumentService: InstrumentService) {
    // Цей Json екземпляр має використовувати ваш appJsonSerializersModule та classDiscriminator
    val webSocketJson = Json {
        serializersModule = appJsonSerializersModule
        classDiscriminator = "instrumentClass"
        prettyPrint = true
        isLenient = true
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    webSocket("/ws/dashboard") {
        try {
            val instruments = instrumentService.getAllInstruments()
            val initialState: WebSocketMessage = WebSocketMessage.FullState(instruments)

            val initialStateJsonString = webSocketJson.encodeToString(initialState) // Простий виклик
            application.log.info("SERVER SENDING (FullState) RAW JSON: $initialStateJsonString")
            send(initialStateJsonString)

            application.log.info("WebSocket client connected, initial state sent with ${instruments.size} instruments.")

            instrumentService.valueUpdates.collectLatest { updateData: InstrumentValueUpdate ->
                val message: WebSocketMessage = WebSocketMessage.ValueUpdate(updateData)

                val valueUpdateJsonString = webSocketJson.encodeToString(message) // Простий виклик
                application.log.info("SERVER SENDING (ValueUpdate) RAW JSON: $valueUpdateJsonString")
                send(valueUpdateJsonString)
            }
        } catch (e: Exception) {
            application.log.error("WebSocket error in /ws/dashboard: ${e.message}", e)
        } finally {
            application.log.info("WebSocket client disconnected from /ws/dashboard.")
        }
    }
}