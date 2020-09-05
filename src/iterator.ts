//! iterator.js - ES5 compatible Rust-inspired iterator.

type IteratorResult<T> = {
        value: T;
        done: false;
} | {
        value: undefined;
        done: true;
};

function setPrototype<T>(target: T & { __proto__: object | null }, proto: object | null): T & { __proto__: typeof proto } {
        target.__proto__ = proto;
        return target;
}

interface Iterator<T> {
        __proto__: Iterator<T>;
}

abstract class Iterator<T> {
        protected done: boolean = false;

        abstract next(): IteratorResult<T>;

        constructor() {
                const next = this.next;
                this.next = this._next;
                this._next = next;
        }

        private _next(): IteratorResult<T> {
                if (this.done)
                        return { value: undefined, done: true };

                const val = this._next();
                if (val.done)
                        this.done = true;

                return val;
        }

        collect() {
                const res: any = [];
                let v;
                while (!(v = this.next()).done)
                        res.push(v.value!);

                return res;
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
                while (n-- > 0) {
                        if ((val = this.next()).done)
                                break;
                }

                return val?.value;
        }

        skip(n: number): this {
                this.nth(n);
                return this;
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
                        const val = this.iter.next();
                        this.done = val.done || !this.pred.call(undefined, val.value);
                        if (!this.done)
                                return val;
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
