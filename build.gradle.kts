val kotlin_version: String by project
val logback_version: String by project
val kmongo_version = "4.11.1"
val ktor_version: String by project

plugins {
    kotlin("jvm") version "2.1.10"
    id("io.ktor.plugin") version "3.1.3"
    id("org.jetbrains.kotlin.plugin.serialization") version "2.1.10"
}

group = "com.example"
version = "0.0.1"

application {
    mainClass.set("com.example.ApplicationKt")
}

repositories {
    mavenCentral()
}

dependencies {
    // Ktor - використовуємо версії з -jvm для серверної розробки
    // Якщо плагін Ktor керує версіями, ці рядки з $ktor_version можуть бути зайвими або конфліктувати.
    // Зазвичай плагін Ktor додає їх автоматично.
    // Я залишу їх, але якщо виникають конфлікти версій, спробуйте їх закоментувати.
    implementation("io.ktor:ktor-server-core-jvm:$ktor_version")
    implementation("io.ktor:ktor-server-netty-jvm:$ktor_version")
    implementation("io.ktor:ktor-server-content-negotiation-jvm:$ktor_version")
    implementation("io.ktor:ktor-serialization-kotlinx-json-jvm:$ktor_version")
    implementation("io.ktor:ktor-server-websockets-jvm:$ktor_version")
    implementation("io.ktor:ktor-server-cors-jvm:$ktor_version")
    implementation("io.ktor:ktor-server-host-common-jvm:$ktor_version") // Для статичних файлів
    implementation("io.ktor:ktor-server-status-pages-jvm:$ktor_version") // Для обробки помилок
    implementation("io.ktor:ktor-server-call-logging-jvm:$ktor_version") // Для логування запитів
    implementation("io.ktor:ktor-server-config-yaml:$ktor_version") // Якщо використовуєте application.yaml

    implementation("org.litote.kmongo:kmongo-serialization:5.2.0")
    implementation("org.litote.kmongo:kmongo-coroutine-serialization:5.2.0")

    implementation("ch.qos.logback:logback-classic:$logback_version")

}

