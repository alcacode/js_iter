//! string_iterator.js - Iterator specialization for String.

function StringIterator(str: string): ExactSizeIterator<string> {
        if (typeof str !== "string")
                throw TypeError("'" + str + "' is not a string");

        const iter = Iterator.from(str);
        iter.collect = function() {
                let res = "";

                let val;
                while (!(val = this.next()).done)
                        res += val.value;

                return res;
        };

        return iter;
}
