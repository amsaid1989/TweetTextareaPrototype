/**
 * NOTE (Abdelrahman): There might be a better way to create
 * the testing patterns. We could start the hashtag and mention
 * patterns with the character before the '#' or '@'. This way
 * some things might be implemented in a much easier way, such
 * as what happens when two matching words of different types
 * come after the other with nothing in between to separate
 * them.
 *
 * The way Twitter behaves in this case is that it formats
 * the first word and leaves the second unformatted. The way
 * this is implemented in the current version of the code is
 * a bit convoluted. Checking the character before the '#' or
 * '@' with the Regex patterns could simplify this.
 */

const hashtagRegex = /#\w*[a-zA-Z]+\w*/;
const mentionRegex = /@\w+/;
const hashtagOrMentionRegex = new RegExp(
    hashtagRegex.source + "|" + mentionRegex.source
);
const nonWordPattern = /[^#@\w]/;

export { hashtagRegex, mentionRegex, hashtagOrMentionRegex, nonWordPattern };
