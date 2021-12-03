const hashtagRegex = /#\w*[a-zA-Z]+\w*/;
const mentionRegex = /@\w+/;
const hashtagOrMentionRegex = new RegExp(
    hashtagRegex.source + "|" + mentionRegex.source
);
const nonWordPattern = /[^#@\w]/;

export { hashtagOrMentionRegex, nonWordPattern };
