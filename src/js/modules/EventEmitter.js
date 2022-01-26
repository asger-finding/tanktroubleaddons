export default class EventEmitter {
    constructor() {
        this.listeners = {};
    }

    on(type, listener) {
        this.listeners[type] = this.listeners[type] || [];
        this.listeners[type].push(listener);
    }

    emit(type, ...args) {
        let listeners = this.listeners[type] || [];

        listeners.forEach(listener => listener.apply(null, args));
    }
}