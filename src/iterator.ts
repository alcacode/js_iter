//! iterator.js - ES5 compatible Rust-inspired iterator.

type IteratorResult<T> = {
        value: T;
        done: false;
} | {
        value: undefined;
        done: true;
};

type ProtoAttr = { __proto__: object | null };

function setPrototype<T, U>(target: T, proto: object | null): U & ProtoAttr {
        (target as T & ProtoAttr).__proto__ = proto;
        return target as any;
}

interface Iterator<T> {
        __proto__: Iterator<T>;
}

abstract class Iterator<T> {
        protected peekBuf: IteratorResult<T> | null = null;
        protected done: boolean = false;

        abstract next(): IteratorResult<T>;

        constructor() {
                const next = this.next;
                this.next = this._next;
                this._next = next;
        }

        static from<T>(iterable: { length: number; [index: number]: T; }): ExactSizeIterator<T> {
                return new class extends ExactSizeIterator<T> {
                        private offset = 0;

                        len() {
                                return iterable.length - this.offset;
                        }

                        next(): IteratorResult<T> {
                                return this.isEmpty()
                                        ? { value: undefined, done: true }
                                        : { value: iterable[this.offset++], done: false };
                        }
                }();
        }

        private derive(iter: Iterator<T>): Iterator<T>;
        private derive<U>(iter: Iterator<T>, next: (() => IteratorResult<U>) | CurriedIteratorResult<T, U>): Iterator<U>;
        private derive<U>(iter: Iterator<T>, next?: (() => IteratorResult<U>) | CurriedIteratorResult<T, U>): Iterator<T|U> {
                const self = new (class extends Iterator<T|U> {
                        next = next instanceof Function
                                ? (next.length === 0
                                        ? next as () => IteratorResult<T>
                                        : (next as CurriedIteratorResult<T, U>)(iter)
                                  )
                                : iter.next;
                })();
                self.__proto__ = Object.create(iter);

                return self;
        }

        private _next(): IteratorResult<T> {
                if (this.peekBuf !== null) {
                        const val = this.peekBuf;
                        this.peekBuf = null;

                        return val;
                }

                if (this.done)
                        return { value: undefined, done: true };

                const val = this._next();
                if (val.done)
                        this.done = true;

                return val;
        }

        /** Peeks at the next value without incrementing the `Iterator`. */
        peek(): IteratorResult<T> {
                if (this.peekBuf === null)
                        this.peekBuf = this.next();

                return this.peekBuf;
        }

        /**
         * Consumes the `Iterator` and returns the yielded values.
         * 
         * The default implementation returns `T[]`. Specializations may
         * use other forms of collections (such as `String`).
         */
        collect() {
                const res: any = [];
                let v;
                while (!(v = this.next()).done)
                        res.push(v.value!);

                return res;
        }

        map<U>(f: (value: T) => U): Iterator<U> {
                return Iterator.prototype.derive(
                        this,
                        function(_super: Iterator<T>) {
                                return function(): IteratorResult<U> {
                                        const res = _super.next();
                                        if (!res.done)
                                                return { value: f(res.value), done: false };

                                        return res;
                                }
                        }
                );
        }

        /** Creates an iterator that yields the first `n` values. */
        take(n: number): Iterator<T> {
                const self = this;
                const o: Iterator<T> = Object.create(self);
                o.next = function() {
                        if (n > 0) {
                                n -= 1;
                                return self.next();
                        }
                        return { value: undefined, done: true };
                };
                return o;
        }

        /** 
         * Creates an `Iterator` that yield values while `predicate` returns `true`.
         */
        takeWhile(predicate: (val: T) => boolean): TakeWhile<T> {
                return setPrototype(new TakeWhile(this, predicate), this);
        }

        /** 
         * Creates an `Iterator` that skip values until `predicate` returns `false`.
         * After returning `false` no more values are skipped.
         */
        skipWhile(predicate: (val: T) => boolean): SkipWhile<T> {
                return setPrototype(new SkipWhile(this, predicate), this);
        }

        /** Yields the `n`th value of the iterator. */
        nth(n: number): T | undefined {
                let val;
                while (n-- >= 0 && !(val = this.next()).done) ; // Empty block.

                return val?.value;
        }

        /** Creates an `Iterator` that skips the first `n` values. */
        skip(n: number): Iterator<T> {
                const self = this;
                const iter: Iterator<T> = Object.create(self);
                iter.next = function(): IteratorResult<T> {
                        let val: IteratorResult<T> = { value: undefined, done: true };
                        while (n-- >= 0 && !(val = self.next()).done) ; // Empty block.

                        delete iter.next;
                        return val;
                }

                return iter;
        }
}

abstract class ExactSizeIterator<T> extends Iterator<T> {
        /** Returns `true` if the `Iterator` is empty. */
        isEmpty(): boolean {
                return this.len() <= 0;
        }

        /**
         * Returns the exact length of the `Iterator`. This is equivallent
         * to the number of remaining iterations.
         */
        abstract len(): number;
}

class TakeWhile<T> extends Iterator<T> {
        constructor(
                private iter: Iterator<T>,
                private pred: (val: T) => boolean,
        ) { super(); }

        next(): IteratorResult<T> {
                if (!this.done) {
                        const val = this.iter.peek();
                        this.done = val.done || !this.pred.call(undefined, val.value);
                        if (!this.done)
                                return this.iter.next();
                }

                return { value: undefined, done: true };
        }
}

class SkipWhile<T> extends Iterator<T> {
        private flag: boolean = false;

        constructor(
                private iter: Iterator<T>,
                private pred: (val: T) => boolean,
        ) { super(); }

        next(): IteratorResult<T> {
                if (!this.flag) {
                        let val;
                        while (!(val = this.iter.next()).done
                                 && this.pred.call(undefined, val.value!)) ; // Empty block.
                        this.flag = true;
                        return val;
                }

                return this.iter.next();
        }
}
