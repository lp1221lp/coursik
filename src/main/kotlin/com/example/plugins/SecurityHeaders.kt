package com.example.plugins

import io.ktor.http.* // Цей імпорт все ще корисний для інших констант, якщо вони використовуються
import io.ktor.server.application.*
import io.ktor.server.plugins.*
import io.ktor.server.request.*
import io.ktor.server.response.*

fun Application.configureSecurityHeaders() {
    intercept(ApplicationCallPipeline.Plugins) {
        val cspValue = StringBuilder()
        cspValue.append("default-src 'self'; ")
        cspValue.append("script-src 'self' 'unsafe-eval' https:; ")
        cspValue.append("style-src 'self' 'unsafe-inline' https:; ")
        cspValue.append("img-src 'self' data: https:; ")
        cspValue.append("font-src 'self' https: data:; ")
        cspValue.append("object-src 'none'; ")
        cspValue.append("frame-ancestors 'none'; ")

        val wsProtocol = if (call.request.origin.scheme == "https") "wss:" else "ws:"
        val connectSrcHost = call.request.host() ?: "localhost"
        val connectSrcPort = call.request.port().let { if (it == 0 || it == 80 || it == 443) "" else ":$it" }

        cspValue.append("connect-src 'self' $wsProtocol//$connectSrcHost$connectSrcPort; ")

        // Використовуємо рядкове значення для Content-Security-Policy
        call.response.header("Content-Security-Policy", cspValue.toString()) // <--- ЗМІНЕНО ТУТ

        call.response.header("X-Content-Type-Options", "nosniff")
        call.response.header("X-Frame-Options", "DENY")
        call.response.header("Referrer-Policy", "strict-origin-when-cross-origin")

        // HSTS (якщо потрібно і сайт повністю на HTTPS)
        // if (call.request.origin.scheme == "https") {
        //     // Використовуємо HttpHeaders.StrictTransportSecurity, якщо доступно,
        //     // інакше - рядкове значення "Strict-Transport-Security"
        //     try {
        //         call.response.header(HttpHeaders.StrictTransportSecurity, "max-age=31536000; includeSubDomains")
        //     } catch (e: UnresolvedReferenceException) { // Або інший відповідний тип винятку, якщо це необхідно
        //          application.log.warn("HttpHeaders.StrictTransportSecurity not found, using string literal.")
        //          call.response.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        //     }
        // }
    }
}