// Tests commit to throwaway repos: give git an identity, as CI does, whatever the machine's own config holds.
process.env.GIT_AUTHOR_NAME ||= "test"
process.env.GIT_AUTHOR_EMAIL ||= "test@example.com"
process.env.GIT_COMMITTER_NAME ||= "test"
process.env.GIT_COMMITTER_EMAIL ||= "test@example.com"
