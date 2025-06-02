package com.example.plugins

import io.ktor.server.application.*
import io.ktor.server.http.content.*
import io.ktor.server.routing.*
import java.io.File

fun Application.configureStaticFiles() {
    routing {

        staticResources("/assets", "static")


        staticFiles("/", File("src/main/resources/static")) { // Цей шлях вказує на фізичну папку
            default("index.html")
        }
    }
}
