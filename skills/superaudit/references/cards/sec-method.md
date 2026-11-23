when: duty:security
Learn the house pattern first (auth dependency, scope helper, escaping, secret handling, outbound client); deviation is the best predictor. List the entry points this change adds or alters, with who reaches them at the lowest trust. Follow the value to the sink, also through sibling, bulk, retry, cancel and error paths.
A finding names five things: the lower-trust person, the input, the control that should stop it, the boundary crossed, who or what is hurt. Look for the control that already stops it. A fact outside the repo: `needs_validation`, exact fact. Confidence 0.8 or higher.
Denial of service only with the exact cheap request from a lower-trust person that takes the service down. Leave out: rate limits, missing hardening, old packages, log spoofing, regex injection, path-only SSRF, test code, theoretical races, trusted env vars.
Other boundaries: `card sec-identity`, `card sec-access`, `card sec-ai`, `card sec-sinks`, `card sec-delivery`.
