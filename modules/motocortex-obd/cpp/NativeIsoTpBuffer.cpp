// modules/motocortex-obd/cpp/NativeIsoTpBuffer.cpp
// MotoCortex v10.0 - High-Speed C++ Native Ring Buffer & ISO-TP Multi-Frame Decoder

#include <vector>
#include <string>
#include <mutex>
#include <cstdint>

class NativeIsoTpBuffer {
private:
    static constexpr size_t RING_BUFFER_CAPACITY = 256;
    std::vector<std::string> ringBuffer;
    size_t head = 0;
    size_t tail = 0;
    size_t size = 0;
    std::mutex bufferMutex;

public:
    NativeIsoTpBuffer() {
        ringBuffer.resize(RING_BUFFER_CAPACITY);
    }

    /**
     * Push raw CAN / ISO-TP frame payload into native ring buffer without JS thread blocking.
     */
    void pushFrame(const std::string& hexPayload) {
        std::lock_guard<std::mutex> lock(bufferMutex);
        ringBuffer[head] = hexPayload;
        head = (head + 1) % RING_BUFFER_CAPACITY;

        if (size < RING_BUFFER_CAPACITY) {
            size++;
        } else {
            tail = (tail + 1) % RING_BUFFER_CAPACITY; // Overwrite oldest frame
        }
    }

    /**
     * Pop batch of frames for JS bridge consumption.
     */
    std::vector<std::string> popBatch(size_t maxBatchSize) {
        std::lock_guard<std::mutex> lock(bufferMutex);
        std::vector<std::string> batch;

        while (size > 0 && batch.size() < maxBatchSize) {
            batch.push_back(ringBuffer[tail]);
            tail = (tail + 1) % RING_BUFFER_CAPACITY;
            size--;
        }

        return batch;
    }

    void clear() {
        std::lock_guard<std::mutex> lock(bufferMutex);
        head = 0;
        tail = 0;
        size = 0;
    }

    size_t getCount() {
        std::lock_guard<std::mutex> lock(bufferMutex);
        return size;
    }
};

extern "C" {
    static NativeIsoTpBuffer g_isoTpBuffer;

    void native_isotp_push(const char* hexStr) {
        if (hexStr) {
            g_isoTpBuffer.pushFrame(std::string(hexStr));
        }
    }

    void native_isotp_clear() {
        g_isoTpBuffer.clear();
    }
}
