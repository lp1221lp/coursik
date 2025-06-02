package com.example.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
// UUID тут не потрібен, якщо ми генеруємо його в сервісі і id - це String

@Serializable
enum class InstrumentType {
    GAUGE, DIGITAL_DISPLAY, WARNING_PANEL
}

@Serializable
enum class WarningLevel {
    INFO, WARNING, ALARM
}

@Serializable
data class WarningRange(
    // Для ID всередині WarningRange, якщо він зберігається як частина документа Instrument,
    // він не буде головним ключем _id самого документа WarningRange (якщо б це була окрема колекція).
    // Якщо ці ID генеруються клієнтом або сервером і є просто рядками, поточне визначення нормальне.
    val id: String,
    var min: Double,
    var max: Double,
    var message: String,
    var level: WarningLevel,
    var color: String
)

@Serializable
sealed class Instrument {
    @SerialName("_id") // <--- ДОДАНО: Мапимо поле 'id' на '_id' в MongoDB
    abstract val id: String // Залишається String, оскільки ми генеруємо UUID.toString()
    // Значення за замовчуванням буде в підкласах

    abstract val type: InstrumentType // Це поле буде використовуватися kotlinx.serialization,
    // якщо classDiscriminator не налаштований для BSON так само, як для JSON.
    // KMongo може використовувати 'className' або інший дискримінатор для поліморфізму.
    // Якщо ви використовуєте `instrumentClass` як дискримінатор для JSON,
    // переконайтеся, що KMongo (або BSON кодеки) також його використовують або
    // мають інший механізм для поліморфізму.
    // Зазвичай, для sealed classes, kotlinx.serialization додає поле "type"
    // з іменем класу (наприклад, "GAUGE" з @SerialName).

    abstract var name: String
    abstract var x: Int
    abstract var y: Int
    abstract var width: Int
    abstract var height: Int
    abstract var currentValue: Double
    abstract var unit: String
    abstract var dataSource: String?
    abstract var updateIntervalMs: Long?
}

@Serializable
@SerialName("GAUGE") // Це використовується kotlinx.serialization для поля-дискримінатора (зазвичай "type" або те, що вказано в classDiscriminator)
data class GaugeInstrument(
    @SerialName("_id") // Можна повторити тут для ясності, але успадкується з Instrument
    override val id: String = "", // Значення за замовчуванням
    override var name: String,
    override var x: Int,
    override var y: Int,
    override var width: Int = 150,
    override var height: Int = 150,
    override var currentValue: Double = 0.0,
    override var unit: String = "%",
    override var dataSource: String? = null,
    override var updateIntervalMs: Long? = 2000,
    var minValue: Double = 0.0,
    var maxValue: Double = 100.0,
    var dialColor: String = "#f0f0f0",
    var needleColor: String = "#cc0000",
    var valueTextColor: String = "#ffffff",
    var labelFont: String = "Arial"
) : Instrument() {
    // 'type' тут - це властивість Kotlin, яка повертає значення enum.
    // kotlinx.serialization для поліморфізму sealed class зазвичай додає поле
    // (наприклад, "type": "GAUGE") в JSON/BSON на основі @SerialName або імені класу.
    override val type: InstrumentType = InstrumentType.GAUGE
}

@Serializable
@SerialName("DIGITAL_DISPLAY")
data class DigitalDisplayInstrument(
    @SerialName("_id")
    override val id: String = "",
    override var name: String,
    override var x: Int,
    override var y: Int,
    override var width: Int = 120,
    override var height: Int = 60,
    override var currentValue: Double = 0.0,
    override var unit: String = "V",
    override var dataSource: String? = null,
    override var updateIntervalMs: Long? = 1000,
    var textColor: String = "#00ff00",
    var backgroundColor: String = "#000000",
    var font: String = "Segment7",
    var fontSize: Int = 24
) : Instrument() {
    override val type: InstrumentType = InstrumentType.DIGITAL_DISPLAY
}

@Serializable
@SerialName("WARNING_PANEL")
data class WarningPanelInstrument(
    @SerialName("_id")
    override val id: String = "",
    override var name: String,
    override var x: Int,
    override var y: Int,
    override var width: Int = 200,
    override var height: Int = 80,
    override var currentValue: Double = 0.0,
    override var unit: String = "°C",
    override var dataSource: String? = null,
    override var updateIntervalMs: Long? = 3000,
    var ranges: MutableList<WarningRange> = mutableListOf()
) : Instrument() {
    override val type: InstrumentType = InstrumentType.WARNING_PANEL
}

// WebSocket моделі залишаються без змін, оскільки вони не взаємодіють з MongoDB напряму
@Serializable
data class InstrumentValueUpdate(val id: String, val value: Double)

@Serializable
sealed class WebSocketMessage {
    @Serializable
    @SerialName("VALUE_UPDATE")
    data class ValueUpdate(val update: InstrumentValueUpdate) : WebSocketMessage()
    @Serializable
    @SerialName("FULL_STATE")
    data class FullState(val instruments: List<Instrument>) : WebSocketMessage()
}