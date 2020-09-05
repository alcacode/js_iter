//! string_iterator.js - Iterator specialization for String.

class stringIterator extends ExactSizeIterator<string> {
        private offset: number = 0;

        constructor(private str: string) {
                super();

                if (typeof str !== "string")
                        throw TypeError("'" + str + "' is not a string");
        }

        collect(): string {
                let res = "";

                let val;
                while (!(val = this.next()).done)
                        res += val.value;

                return res;
        }

        len(): number {
                return this.str.length - this.offset;
        }

        next(): IteratorResult<string> {
                if (!this.isEmpty()) {
                        return {
                                value: this.str[this.offset++],
                                done: false,
                        };
                }

                return {
                        value: undefined,
                        done: true,
                };
        }
}