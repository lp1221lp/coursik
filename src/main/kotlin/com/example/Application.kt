package com.example

import com.example.plugins.*
import com.example.db.DatabaseFactory
import com.example.service.InstrumentService
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*

fun main() {
    val port = System.getenv("PORT")?.toIntOrNull() ?: 8080 // Для Heroku потрібно брати порт з середовища
    embeddedServer(Netty, port = port, host = "0.0.0.0", module = Application::module)
        .start(wait = true)
}

fun Application.module() {

    val dbConnectionString = System.getenv("MONGODB_URI")
        ?: "mongodb+srv://admin:admin@cluster0.gesmz8i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

    DatabaseFactory.init(dbConnectionString)
    val database = DatabaseFactory.getDatabase()
    val instrumentService = InstrumentService(database)

    configureSecurityHeaders()
    configureCORS()
    configureSerialization()
    configureSockets()
    configureRouting(instrumentService)
    configureStaticFiles()

    environment.monitor.subscribe(ApplicationStopping) {
        instrumentService.stopAllSimulations()
        DatabaseFactory.close()
        println("Simulations halted and DB connection closed")
    }
}
