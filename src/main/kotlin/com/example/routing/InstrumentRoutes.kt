package com.example.routing

import com.example.model.DigitalDisplayInstrument // Додайте імпорти для всіх підкласів
import com.example.model.GaugeInstrument
import com.example.model.Instrument
import com.example.model.WarningPanelInstrument
import com.example.service.InstrumentService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.instrumentRoutes(instrumentService: InstrumentService) {
    route("/api/instruments") {

        // Обробник для HTTP GET запитів на "/api/instruments"
        // Призначення: Отримати список всіх інструментів
        get {
            try {
                val allInstruments = instrumentService.getAllInstruments() // suspend функція
                // Логування на сервері для діагностики
                call.application.log.info("Serving ${allInstruments.size} instruments to client.")
                allInstruments.forEach { instrument ->
                    // Використовуємо instrument::class.simpleName для отримання фактичного типу класу,
                    // або instrument.type, якщо це ваша властивість enum
                    call.application.log.debug("Instrument details: id=${instrument.id}, class=${instrument::class.simpleName}, name=${instrument.name}, unit=${instrument.unit}")
                    when (instrument) {
                        is GaugeInstrument -> {
                            call.application.log.debug(" -> Gauge specific: minValue=${instrument.minValue}, maxValue=${instrument.maxValue}, width=${instrument.width}, currentValue=${instrument.currentValue}")
                        }
                        is DigitalDisplayInstrument -> {
                            call.application.log.debug(" -> DigitalDisplay specific: textColor=${instrument.textColor}, width=${instrument.width}, currentValue=${instrument.currentValue}")
                        }
                        is WarningPanelInstrument -> {
                            call.application.log.debug(" -> WarningPanel specific: rangesCount=${instrument.ranges.size}, width=${instrument.width}, currentValue=${instrument.currentValue}")
                        }
                    }
                }
                call.respond(allInstruments)
            } catch (e: com.mongodb.MongoException) {
                call.application.log.error("MongoDB error fetching all instruments: ${e.message}", e)
                call.respond(HttpStatusCode.InternalServerError, "Database error while fetching instruments.")
            } catch (e: Exception) {
                call.application.log.error("Error fetching all instruments: ${e.message}", e)
                call.respond(HttpStatusCode.InternalServerError, "An unexpected error occurred.")
            }
        }

        // Обробник для HTTP GET запитів на "/api/instruments/{id}"
        get("/{id}") {
            val id = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing ID parameter")
            try {
                val instrument = instrumentService.getInstrumentById(id) // suspend функція
                if (instrument != null) {
                    call.respond(instrument)
                } else {
                    call.respond(HttpStatusCode.NotFound, "Instrument with id [$id] not found")
                }
            } catch (e: com.mongodb.MongoException) {
                call.application.log.error("MongoDB error fetching instrument $id: ${e.message}", e)
                call.respond(HttpStatusCode.InternalServerError, "Database error while fetching instrument.")
            } catch (e: Exception) {
                call.application.log.error("Error fetching instrument $id: ${e.message}", e)
                call.respond(HttpStatusCode.InternalServerError, "An unexpected error occurred.")
            }
        }

        // Обробник для HTTP POST запитів на "/api/instruments"
        post {
            try {
                val instrument = call.receive<Instrument>() // Поліморфна десеріалізація
                call.application.log.info("Received instrument for creation: $instrument") // Логуємо отриманий об'єкт
                val createdInstrument = instrumentService.addInstrument(instrument) // suspend функція
                call.respond(HttpStatusCode.Created, createdInstrument)
            } catch (e: io.ktor.serialization.JsonConvertException) { // Специфічна помилка десеріалізації
                call.application.log.error("Failed to deserialize instrument for POST: ${e.message}", e)
                call.respond(HttpStatusCode.BadRequest, "Invalid instrument data format: ${e.message}")
            } catch (e: com.mongodb.MongoException) {
                call.application.log.error("MongoDB error adding instrument: ${e.message}", e)
                call.respond(HttpStatusCode.InternalServerError, "Database error while adding instrument.")
            } catch (e: Exception) {
                call.application.log.error("Failed to add instrument: ${e.message}", e)
                // Можливо, варто перевірити тип винятку, щоб не надсилати деталі внутрішніх помилок
                call.respond(HttpStatusCode.BadRequest, "Invalid instrument data or server error: ${e.message}")
            }
        }

        // Обробник для HTTP PUT запитів на "/api/instruments/{id}"
        put("/{id}") {
            val id = call.parameters["id"] ?: return@put call.respond(HttpStatusCode.BadRequest, "Missing ID parameter")
            try {
                val instrument = call.receive<Instrument>()
                call.application.log.info("Received instrument for update (id: $id): $instrument")
                val updatedInstrument = instrumentService.updateInstrument(id, instrument) // suspend функція
                if (updatedInstrument != null) {
                    call.respond(updatedInstrument)
                } else {
                    call.respond(HttpStatusCode.NotFound, "Instrument with id [$id] not found for update")
                }
            } catch (e: io.ktor.serialization.JsonConvertException) {
                call.application.log.error("Failed to deserialize instrument for PUT $id: ${e.message}", e)
                call.respond(HttpStatusCode.BadRequest, "Invalid instrument data format: ${e.message}")
            } catch (e: com.mongodb.MongoException) {
                call.application.log.error("MongoDB error updating instrument $id: ${e.message}", e)
                call.respond(HttpStatusCode.InternalServerError, "Database error while updating instrument.")
            } catch (e: Exception) {
                call.application.log.error("Failed to update instrument $id: ${e.message}", e)
                call.respond(HttpStatusCode.BadRequest, "Invalid instrument data or server error: ${e.message}")
            }
        }

        // Обробник для HTTP DELETE запитів на "/api/instruments/{id}"
        delete("/{id}") {
            val id = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest, "Missing ID parameter")
            try {
                if (instrumentService.deleteInstrument(id)) { // suspend функція
                    call.respond(HttpStatusCode.NoContent)
                } else {
                    call.respond(HttpStatusCode.NotFound, "Instrument with id [$id] not found for deletion")
                }
            } catch (e: com.mongodb.MongoException) {
                call.application.log.error("MongoDB error deleting instrument $id: ${e.message}", e)
                call.respond(HttpStatusCode.InternalServerError, "Database error while deleting instrument.")
            } catch (e: Exception) {
                call.application.log.error("Error deleting instrument $id: ${e.message}", e)
                call.respond(HttpStatusCode.InternalServerError, "An unexpected error occurred.")
            }
        }
    }
}