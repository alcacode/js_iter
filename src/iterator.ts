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
        private peekBuf: IteratorResult<T> | null = null;
        protected done: boolean = false;

        abstract next(): IteratorResult<T>;

        constructor() {
                const next = this.next;
                this.next = this._next;
                this._next = next;
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

        peek(): IteratorResult<T> {
                if (this.peekBuf === null)
                        this.peekBuf = this.next();

                return this.peekBuf;
        }

        collect() {
                const res: any = [];
                let v;
                while (!(v = this.next()).done)
                        res.push(v.value!);

                return res;
        }

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
         * Creates a new `Iterator` yielding values while `predicate` returns `true`.
         */
        takeWhile(predicate: (val: T) => boolean): TakeWhile<T> {
                return setPrototype(new TakeWhile(this, predicate), this);
        }

        /** 
         * Creates a new `Iterator` that skip values until `predicate`
         * returns `false`.
         * After returning `false` no more values are skipped.
         */
        skipWhile(predicate: (val: T) => boolean): SkipWhile<T> {
                return setPrototype(new SkipWhile(this, predicate), this);
        }

        nth(n: number): T | undefined {
                let val;
                while (n-- >= 0 && !(val = this.next()).done) ; // Empty block.

                return val?.value;
        }

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
