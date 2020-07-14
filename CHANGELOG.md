# [5.0.0-next.1](https://github.com/podium-lib/layout/compare/v4.6.0...v5.0.0-next.1) (2020-07-14)


### Features

* Drop node 10.x support ([7e0bb22](https://github.com/podium-lib/layout/commit/7e0bb22c7756c8597422673f244caef493f08ad2))


### BREAKING CHANGES

* Only support node 12 and 14.

# [4.6.0](https://github.com/podium-lib/layout/compare/v4.5.1...v4.6.0) (2020-06-28)


### Features

* Added support for data-* attributes on .js() method ([516909c](https://github.com/podium-lib/layout/commit/516909cada29497910a4e06fdb0d3d9698229ca4))

# Changelog

Notable changes to this project will be documented in this file.

The latest version of this document is always available in [releases][releases-url].

## [unreleased]

## [3.0.4] - 2019-03-27

-   Updated @podium/proxy to version 3.0.4 - [#28](https://github.com/podium-lib/layout/pull/28)
-   Updated @podium/context to version 3.0.3 - [#27](https://github.com/podium-lib/layout/pull/27)
-   Updated @podium/utils to version 3.1.2 - [#25](https://github.com/podium-lib/layout/pull/25)
-   Updated other dependencies

## [3.0.3] - 2019-03-15

This release center around hardening piping of streams on the requests to the
podlets.

-   Update @podium/client to version 3.0.5 - [#24](https://github.com/podium-lib/layout/pull/24)
-   Update readable-stream to version 3.2.0

## [3.0.2] - 2019-03-11

This release center around removing Max Eventlistener warnings and improve error
handling on internall streams.

-   Update @metrics/client to version 2.4.1 - [#17](https://github.com/podium-lib/layout/pull/17)
-   Update @podium/client to version 3.0.4 - [#23](https://github.com/podium-lib/layout/pull/23)
-   Update @podium/context to version 3.0.2 - [#19](https://github.com/podium-lib/layout/pull/19)
-   Update @podium/proxy to version 3.0.3 - [#22](https://github.com/podium-lib/layout/pull/22)

## [3.0.1] - 2019-03-05

-   Add error event listeners on all metric streams - [#15](https://github.com/podium-lib/layout/pull/15)
-   Update @podium/client to version 3.0.2 - [#14](https://github.com/podium-lib/layout/pull/14)
-   Update @podium/context to version 3.0.1 - [#13](https://github.com/podium-lib/layout/pull/13)
-   Update @podium/proxy to version 3.0.1 - [#12](https://github.com/podium-lib/layout/pull/12)

## [3.0.0] - 2019-02-21

-   Initial open source release. Module is made http framework free and open source - [#6](https://github.com/podium-lib/layout/pull/6)

## [2.5.0] - 2019-01-03

-   Add metrics collection from @podium/proxy (updated to 2.4.0)
-   Fixes to @podium/client fallback metrics (updated to 2.2.3)
-   Updated readable stream to 3.1.1
-   Updated joi to 14.3.1
-   Replaced @podium/metrics with @metrics/client@2.2.0

## [2.4.5] - 2018-12-21

-   Fix layout name decoration in metrics

## [2.4.4] - 2018-12-21

-   Update @podium/client to version 2.2.2
-   Update joi to version 14.3.0
-   Update abslog to version 2.2.3

[unreleased]: https://github.com/podium-lib/layout/compare/v3.0.4...HEAD
[3.0.4]: https://github.com/podium-lib/layout/compare/v3.0.3...v3.0.4
[3.0.3]: https://github.com/podium-lib/layout/compare/v3.0.2...v3.0.3
[3.0.2]: https://github.com/podium-lib/layout/compare/v3.0.1...v3.0.2
[3.0.1]: https://github.com/podium-lib/layout/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/podium-lib/layout/compare/v2.4.5...v3.0.0
[2.5.0]: https://github.com/podium-lib/layout/compare/v2.4.5...v2.5.0
[2.4.5]: https://github.com/podium-lib/layout/compare/v2.4.4...v2.4.5
[2.4.4]: https://github.com/podium-lib/layout/compare/v2.4.3...v2.4.4
[releases-url]: https://github.com/podium-lib/layout/blob/master/CHANGELOG.md
