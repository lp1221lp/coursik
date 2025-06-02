// backend/src/main/kotlin/com/example/db/DatabaseFactory.kt
package com.example.db
import org.litote.kmongo.coroutine.CoroutineClient
import org.litote.kmongo.coroutine.CoroutineDatabase
import org.litote.kmongo.reactivestreams.KMongo

object DatabaseFactory {
    private var kmongoCoroutineClient: CoroutineClient? = null
    val databaseName = "cursova"

    fun init(connectionStringValue: String) {
        if (kmongoCoroutineClient == null) {
            try {
                println("KMongo: Attempting to initialize with connection string: $connectionStringValue")
                val reactiveStreamsMongoClient = KMongo.createClient(connectionStringValue)
                kmongoCoroutineClient = CoroutineClient(reactiveStreamsMongoClient)

                println("KMongo CoroutineClient initialized successfully for database: $databaseName")
            } catch (e: Exception) {
                println("KMongo: Error initializing client: ${e.message}")
                e.printStackTrace()
                throw e
            }
        }
    }

    fun getDatabase(): CoroutineDatabase {
        return kmongoCoroutineClient?.getDatabase(databaseName)
            ?: throw IllegalStateException("KMongo CoroutineClient has not been initialized. Call DatabaseFactory.init() first.")
    }

    fun close() {
        println("KMongo: Client resources would be closed here.")
        kmongoCoroutineClient = null
    }
}