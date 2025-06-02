package com.example.service

import com.example.model.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import org.litote.kmongo.coroutine.CoroutineCollection
import org.litote.kmongo.coroutine.CoroutineDatabase
import org.litote.kmongo.eq
import java.io.File
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import kotlin.random.Random

class InstrumentService(private val database: CoroutineDatabase) {

    private val instrumentsCollection: CoroutineCollection<Instrument> = database.getCollection<Instrument>("instruments")
    private val simulationJobs = ConcurrentHashMap<String, Job>()
    private val _valueUpdates = MutableSharedFlow<InstrumentValueUpdate>(replay = 1)
    val valueUpdates = _valueUpdates.asSharedFlow()

    init {
        println("InstrumentService: Initializing...")
        CoroutineScope(Dispatchers.IO + SupervisorJob()).launch {
            try {
                val count = instrumentsCollection.countDocuments()
                println("InstrumentService: Found $count instruments in DB.")
                if (count == 0L) {
                    println("KMongo: Database is empty. Initializing sample instruments...")
                    // Додаємо приклади інструментів
                    addInstrument(GaugeInstrument(name = "Speed", x = 50, y = 50, currentValue = 0.0, unit = "km/h", maxValue = 220.0, dataSource = "sim:random(0,220)"))
                    addInstrument(DigitalDisplayInstrument(name = "RPM", x = 250, y = 50, currentValue = 700.0, unit = "RPM", dataSource = "sim:random(700,6000)"))
                    addInstrument(WarningPanelInstrument(name = "Engine Temp", x = 50, y = 250, currentValue = 90.0, unit = "°C", dataSource = "sim:random(60,120)",
                        ranges = mutableListOf(
                            WarningRange(id = generateId(), min = 0.0, max = 80.0, message = "COLD", level = WarningLevel.INFO, color = "#3498db"),
                            WarningRange(id = generateId(), min = 80.1, max = 105.0, message = "NORMAL", level = WarningLevel.INFO, color = "#2ecc71"),
                            WarningRange(id = generateId(), min = 105.1, max = 115.0, message = "HOT", level = WarningLevel.WARNING, color = "#f39c12"),
                            WarningRange(id = generateId(), min = 115.1, max = 200.0, message = "OVERHEAT!", level = WarningLevel.ALARM, color = "#e74c3c")
                        )))
                    println("KMongo: Sample instruments initialized and simulations started via addInstrument.")
                } else {
                    // Запускаємо симуляції для всіх існуючих інструментів з БД при старті
                    println("KMongo: Starting simulations for existing instruments...")
                    var startedSimulations = 0
                    instrumentsCollection.find().consumeEach { instrument ->
                        println("InstrumentService init: Processing instrument from DB - ID: ${instrument.id}, Name: ${instrument.name}, DataSource: ${instrument.dataSource}")
                        startOrUpdateSimulation(instrument)
                        startedSimulations++
                    }
                    println("KMongo: Attempted to start $startedSimulations simulations for existing instruments.")
                }
            } catch (e: Exception) {
                println("KMongo: Error during InstrumentService initialization: ${e.message}")
                e.printStackTrace()
            }
        }
        println("InstrumentService: Initialization block finished (async tasks launched).")
    }

    private fun generateId(): String = UUID.randomUUID().toString()

    suspend fun getAllInstruments(): List<Instrument> {
        println("InstrumentService: getAllInstruments called")
        return try {
            instrumentsCollection.find().toList()
        } catch (e: Exception) {
            println("KMongo: Error fetching all instruments: ${e.message}")
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun getInstrumentById(id: String): Instrument? {
        println("InstrumentService: getInstrumentById called for ID: $id")
        return try {
            instrumentsCollection.findOne(Instrument::id eq id)
        } catch (e: Exception) {
            println("KMongo: Error fetching instrument by id $id: ${e.message}")
            e.printStackTrace()
            null
        }
    }

    suspend fun addInstrument(instrument: Instrument): Instrument {
        val newGeneratedId = generateId()
        val instrumentToInsert = when (instrument) {
            is GaugeInstrument -> instrument.copy(id = newGeneratedId)
            is DigitalDisplayInstrument -> instrument.copy(id = newGeneratedId)
            is WarningPanelInstrument -> instrument.copy(id = newGeneratedId)
        }
        println("InstrumentService: addInstrument called. New ID: $newGeneratedId, Name: ${instrumentToInsert.name}, DataSource: ${instrumentToInsert.dataSource}")
        try {
            instrumentsCollection.insertOne(instrumentToInsert)
            println("InstrumentService: Instrument ${instrumentToInsert.id} inserted into DB.")
            startOrUpdateSimulation(instrumentToInsert)
            return instrumentToInsert
        } catch (e: Exception) {
            println("KMongo: Error adding instrument (ID: $newGeneratedId, Name: ${instrumentToInsert.name}): ${e.message}")
            e.printStackTrace()
            throw e
        }
    }

    suspend fun updateInstrument(id: String, updatedInstrumentData: Instrument): Instrument? {
        val instrumentWithCorrectId = when (updatedInstrumentData) {
            is GaugeInstrument -> updatedInstrumentData.copy(id = id)
            is DigitalDisplayInstrument -> updatedInstrumentData.copy(id = id)
            is WarningPanelInstrument -> updatedInstrumentData.copy(id = id)
        }
        println("InstrumentService: updateInstrument called for ID: $id, New Name: ${instrumentWithCorrectId.name}, New DataSource: ${instrumentWithCorrectId.dataSource}")
        try {
            val result = instrumentsCollection.replaceOne(Instrument::id eq id, instrumentWithCorrectId)
            if (result.modifiedCount > 0L || (result.matchedCount > 0L && result.modifiedCount == 0L)) {
                println("InstrumentService: Instrument $id updated in DB (modified: ${result.modifiedCount > 0L}). Restarting simulation.")
                startOrUpdateSimulation(instrumentWithCorrectId)
                return instrumentWithCorrectId
            } else {
                println("KMongo: Instrument with id $id not found for update or no changes made.")
                return getInstrumentById(id) // Повертаємо поточний стан, якщо він ще існує
            }
        } catch (e: Exception) {
            println("KMongo: Error updating instrument $id: ${e.message}")
            e.printStackTrace()
            throw e
        }
    }

    suspend fun deleteInstrument(id: String): Boolean {
        println("InstrumentService: deleteInstrument called for ID: $id")
        stopSimulation(id)
        return try {
            val result = instrumentsCollection.deleteOne(Instrument::id eq id)
            val deleted = result.deletedCount > 0
            println("InstrumentService: Instrument $id deletion from DB successful: $deleted")
            deleted
        } catch (e: Exception) {
            println("KMongo: Error deleting instrument $id: ${e.message}")
            e.printStackTrace()
            false
        }
    }

    private fun startOrUpdateSimulation(instrument: Instrument) {
        val instrumentIdForJob = instrument.id // Зберігаємо ID, бо 'instrument' може змінитися, якщо це var (хоча тут val)
        println("InstrumentService: Attempting to start/update simulation for ID: $instrumentIdForJob, Name: ${instrument.name}, DataSource: '${instrument.dataSource}'")

        stopSimulation(instrumentIdForJob) // Зупиняємо попередню симуляцію, якщо була

        val dataSource = instrument.dataSource
        if (dataSource == null || dataSource.isBlank()) {
            println("InstrumentService: DataSource is null or blank for $instrumentIdForJob. Simulation will not start.")
            return
        }
        val interval = instrument.updateIntervalMs ?: 2000L
        println("InstrumentService: Starting simulation for $instrumentIdForJob with interval $interval ms.")

        simulationJobs[instrumentIdForJob] = CoroutineScope(Dispatchers.IO + SupervisorJob()).launch {
            var currentLocalValue = instrument.currentValue
            println("InstrumentService: Simulation loop started for $instrumentIdForJob. Initial value: $currentLocalValue")
            try {
                while (isActive) {
                    delay(interval)
                    val newValue = when {
                        dataSource.startsWith("sim:random") -> {
                            val paramsString = dataSource.substringAfter("sim:random(").removeSuffix(")")
                            val params = paramsString.split(",").map { it.trim() }
                            val min = params.getOrNull(0)?.toDoubleOrNull() ?: 0.0
                            val max = params.getOrNull(1)?.toDoubleOrNull() ?: 100.0
                            Random.nextDouble(min, max)
                        }
                        dataSource.startsWith("file:") -> {
                            val filePath = dataSource.substringAfter("file:")
                            try {
                                File(filePath).readText().trim().toDoubleOrNull() ?: currentLocalValue
                            } catch (e: Exception) {
                                println("InstrumentService: Error reading file $filePath for $instrumentIdForJob: ${e.message}")
                                currentLocalValue
                            }
                        }
                        else -> {
                            println("InstrumentService: Unknown dataSource format '$dataSource' for $instrumentIdForJob. Using current value.")
                            currentLocalValue
                        }
                    }

                    // println("InstrumentService: Sim $instrumentIdForJob, Old: $currentLocalValue, New: $newValue") // Дуже детальний лог
                    if (newValue != currentLocalValue) {
                        currentLocalValue = newValue
                        println("InstrumentService: Emitting value update for $instrumentIdForJob. New value: $currentLocalValue")
                        _valueUpdates.emit(InstrumentValueUpdate(instrumentIdForJob, currentLocalValue))
                    }
                }
            } catch (e: CancellationException) {
                println("InstrumentService: Simulation for $instrumentIdForJob was cancelled.")
            } catch (e: Exception) {
                println("InstrumentService: Error in simulation loop for $instrumentIdForJob: ${e.message}")
                e.printStackTrace()
            } finally {
                println("InstrumentService: Simulation loop for $instrumentIdForJob ended (isActive: $isActive).")
            }
        }
        if (simulationJobs[instrumentIdForJob]?.isActive == true) {
            println("InstrumentService: Simulation job for $instrumentIdForJob is active.")
        } else {
            println("InstrumentService: Simulation job for $instrumentIdForJob FAILED TO START or was immediately cancelled.")
        }
    }

    private fun stopSimulation(instrumentId: String) {
        val job = simulationJobs.remove(instrumentId)
        if (job != null) {
            println("InstrumentService: Stopping simulation for ID: $instrumentId")
            job.cancel() // Скасовуємо корутину
        }
    }

    fun stopAllSimulations() {
        println("InstrumentService: Stopping all simulations (${simulationJobs.size} jobs).")
        simulationJobs.values.forEach { it.cancel() }
        simulationJobs.clear()
        println("InstrumentService: All simulations stopped.")
    }
}