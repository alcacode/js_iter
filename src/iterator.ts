//! iterator.js - ES5 compatible Rust-inspired iterator.

/**
 * Returns `true` if `num` satisfies [`min` <= `num` <= `max`].\\
 * Returns `false` if `num` is `NaN` or not of type `number`.
 *
 * @param num The `Number` to be tested.
 * @param min Minimal allowed value. Defaults to `Number.NEGATIVE_INFINITY`.
 * @param max Maximal allowed value. Defaults to `Number.POSITIVE_INFINITY`.
 */
function numInRange(num: number, min?: number, max?: number): boolean {
        if (min === undefined)
                min = Number.NEGATIVE_INFINITY;

        if (max === undefined)
                max = Number.POSITIVE_INFINITY;

        return typeof num === "number"
               && num === num // NaN is not equal to itself
               && num >= min
               && num <= max;
}

type IteratorResult<T> = {
        value: T;
        done: false;
} | {
        value: undefined;
        done: true;
};

type ProtoAttr = { __proto__: object | null };
/**
 * Function returning a function bound to `thisVal` returning an
 * `IteratorResult<R>`.
 */
type CurriedIteratorResult<T, R = T> = (thisVal: Iterator<T>) => () => IteratorResult<R>;

function setPrototype<T, U>(target: T, proto: object | null): U & ProtoAttr {
        (target as T & ProtoAttr).__proto__ = proto;
        return target as any;
}

interface Iterator<T> {
        __proto__: Iterator<any>;
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

        static derive<T>(iter: Iterator<T>): Iterator<T>;
        static derive<T, U>(iter: Iterator<T>, next: (() => IteratorResult<U>) | CurriedIteratorResult<T, U>): Iterator<U>;
        static derive<T, U>(iter: Iterator<T>, next?: (() => IteratorResult<U>) | CurriedIteratorResult<T, U>): Iterator<T|U> {
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

        /**
         * Consumes self and returns the yielded values.
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
                return Iterator.derive(
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

        /**
         * Creates an iterator yielding `n` values at a time.
         *
         * If `n` is not evenly divisible by the length of the iterator the
         * last chunk will contain the length of the iterator mod `n` elements.
         *
         * @param n Number of values to yield.
         */
        chunks(n: number): Iterator<T[]> {
                /** 
                 * 0xFFFFFFFF (2^32 - 1) is the largest value representable by
                 * an unsigned 32-bit integer (u32).
                 */
                if (!numInRange(n, 1, 0xFFFFFFFF))
                        throw RangeError("chunk size does not satisfy [0 < `n` < 4,294,967,296]");

                // Cast to u32. This is equivalent to floor(x), 0 <= x <= 0xFFFFFFFF.
                n = n >>> 0;

                const iter = Iterator.derive(
                        this,
                        function(_super: Iterator<T>) {
                                return function(): IteratorResult<T[]> {
                                        const rval: T[] = _super.take(n).collect();

                                        return rval.length !== 0
                                                ? { value: rval, done: false }
                                                : { value: undefined, done: true };
                                }
                        }
                );

                if (iter.collect !== Iterator.prototype.collect)
                        iter.collect = Iterator.prototype.collect;

                return iter;
        }

        /**
         * Creates an iterator yielding values based on a `predicate` function.
         */
        filter(predicate: (value: T) => boolean): Iterator<T> {
                return Iterator.derive(
                        this,
                        function(_super) {
                                return function(): IteratorResult<T> {
                                        let res;
                                        while (!(res = _super.next()).done && !predicate(res.value)) {
                                                /* Intentionally left empty. */
                                        }
                                        return res;
                                }
                        }
                )
        }

        /**
         * Peeks at the next value without incrementing self.
         *
         * Note that `peek()` does increment underlying `Iterator`s.
         */
        peek(): IteratorResult<T> {
                if (this.peekBuf === null)
                        this.peekBuf = this.next();

                return this.peekBuf;
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
                while (n-- >= 0 && !(val = this.next()).done) {
                        /* Intentionally left empty. */
                }

                return val?.value;
        }

        /** Creates an `Iterator` that skips the first `n` values. */
        skip(n: number): Iterator<T> {
                const self = this;
                const iter: Iterator<T> = Object.create(self);
                iter.next = function(): IteratorResult<T> {
                        let val: IteratorResult<T> = { value: undefined, done: true };
                        while (n-- >= 0 && !(val = self.next()).done) {
                                /* Intentionally left empty. */
                        }

                        iter.next = self.next;
                        return val;
                }

                return iter;
        }
}

abstract class ExactSizeIterator<T> extends Iterator<T> {
        /**
         * Returns the exact length of the `Iterator`. This is equivallent
         * to the number of remaining iterations.
         */
        abstract len(): number;

        constructor() {
                super();

                const len = this.len;
                this.len = this._len;
                this._len = len;
        }

        private _len(): number {
                return this._len() + (this.peekBuf !== null ? 1 : 0);
        }

        /** Returns `true` if the `Iterator` is empty. */
        isEmpty(): boolean {
                return this.len() <= 0;
        }

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
        private _skipDone: boolean = false;

        constructor(
                private iter: Iterator<T>,
                private pred: (val: T) => boolean,
        ) { super(); }

        next(): IteratorResult<T> {
                if (!this._skipDone) {
                        let val;
                        while (!(val = this.iter.next()).done
                                 && this.pred.call(undefined, val.value!)) ; // Empty block.
                        this._skipDone = true;
                        return val;
                }

                return this.iter.next();
        }
}
