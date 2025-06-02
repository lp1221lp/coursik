//package com.example
//
//import com.example.plugins.*
//import com.example.service.InstrumentService
//import io.ktor.server.application.*
//import io.ktor.server.engine.*
//import io.ktor.server.netty.*
//import com.example.plugins.configureSecurityHeaders
//
//fun main() {
//    embeddedServer(Netty, port = 8080, host = "0.0.0.0", module = Application::module)
//        .start(wait = true)
//}
//
//fun Application.module() {
//    val instrumentService = InstrumentService() // Create a single instance
//
//    configureSecurityHeaders()
//    configureSerialization()
//    configureCORS()
//    configureSockets()
//    configureRouting(instrumentService) // Pass the service instance
//    configureStaticFiles() // Serve frontend
//
//    // Graceful shutdown for simulations
//    environment.monitor.subscribe(ApplicationStopping) {
//        instrumentService.stopAllSimulations()
//        println("Application stopping. Simulations halted.")
//    }
//}

package com.example

// Ваші плагіни (переконайтеся, що всі імпорти правильні)
import com.example.plugins.configureCORS
import com.example.plugins.configureRouting
import com.example.plugins.configureSecurityHeaders
import com.example.plugins.configureSerialization
import com.example.plugins.configureSockets
import com.example.plugins.configureStaticFiles // <--- ВАЖЛИВО: ваш файл для статичних ресурсів
import com.example.db.DatabaseFactory

import com.example.service.InstrumentService
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*

fun main() {
    val port = System.getenv("PORT")?.toIntOrNull() ?: 8080
    embeddedServer(Netty, port = port, host = "0.0.0.0", module = Application::module) // Викликаємо ваш основний модуль
        .start(wait = true)
}

fun Application.module() {

    val dbConnectionString = "mongodb+srv://admin:admin@cluster0.gesmz8i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    DatabaseFactory.init(dbConnectionString)

    // Створюємо сервіс, передаючи йому базу даних
    val database: org.litote.kmongo.coroutine.CoroutineDatabase = DatabaseFactory.getDatabase()
    val instrumentService = InstrumentService(database) // Тепер сервіс приймає базу даних


    // Порядок плагінів може мати значення.
    // SecurityHeaders і CORS зазвичай йдуть на початку.
    configureSecurityHeaders()
    configureCORS()

    // Потім конфігурація контенту та сокетів
    configureSerialization()
    configureSockets()

    // Потім роутинг для API
    configureRouting(instrumentService) // Тут визначаються ваші /api роути

    // І нарешті (або іноді раніше, залежно від логіки) статичні файли.
    // Якщо staticResources налаштований на "/", він має бути достатньо "жадібним",
    // щоб обробити запити до файлів, які не підпадають під API роути.
    configureStaticFiles()

    environment.monitor.subscribe(ApplicationStopping) {
        instrumentService.stopAllSimulations()
        DatabaseFactory.close()
        println("Simulations halted and DB connection closed") // Простий варіант
    }
}