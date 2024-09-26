import { Readable } from 'node:stream';

export class ResponseStream extends Readable {
    constructor(options) {
        super(options);
        this.buffer = [];
        this.isReading = false;
    }

    // Method to add data to the internal buffer
    // This method simply adds data; the stream will request it when needed
    send(data) {
        this.buffer.push(data);
        if (this.isReading) {
            this.isReading = false;
            this._read();
        }
    }

    // _read method, automatically called by the stream when it wants more data
    _read() {
        if (this.buffer.length > 0) {
            const chunk = this.buffer.shift(); // Get the next chunk from the buffer
            this.push(chunk); // Push the chunk into the stream
        } else {
            this.isReading = true;
        }
    }

    done() {
        this.emit('done');
    }

    end() {
        setTimeout(() => this.push(null), 0);
    }
}
