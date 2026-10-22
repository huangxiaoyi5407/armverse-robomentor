# Third-party notices and factual references

This project implements its robotics algorithms independently. Factual robot
dimensions and operating limits are attributed below; no Universal Robots code,
CAD model, image, logo, spreadsheet, or document text is redistributed.

## Universal Robots UR5 (classic / CB3)

- **Manufacturer and source:** Universal Robots A/S, “DH Parameters for
  calculations of kinematics and dynamics.”
- **Direct URL:**
  <https://www.universal-robots.com/articles/ur/application-installation/dh-parameters-for-calculations-of-kinematics-and-dynamics>
- **Accessed:** 2026-10-23.
- **Values used (standard DH, metres/radians):**

  | Joint | a (m) | d (m) | alpha (rad) |
  | ---: | ---: | ---: | ---: |
  | 1 | 0 | 0.089159 | pi/2 |
  | 2 | -0.425 | 0 | 0 |
  | 3 | -0.39225 | 0 | 0 |
  | 4 | 0 | 0.10915 | pi/2 |
  | 5 | 0 | 0.09465 | -pi/2 |
  | 6 | 0 | 0.0823 | 0 |

- **Model boundary:** these are the source's rows labelled **UR5**, the classic
  CB-series model. The separate **UR5e/UR7e** rows on the same page use different
  offsets (`d1 = 0.1625 m`, for example) and are intentionally not mixed into
  this project.
- **Joint-range source:** Universal Robots A/S, “UR5 Technical specifications,”
  item 110105, EN 09/2016,
  <https://www.universal-robots.com/media/50588/ur5_en.pdf>, accessed 2026-10-23.
  It specifies six rotating joints and a joint range of +/-360 degrees; the model
  stores the equivalent interval `[-2*pi, 2*pi]` radians for each joint.
- **Copyright / licence status:** the technical sheet states “Copyright (c)
  2009-2016 by Universal Robots A/S. All rights reserved.” The DH web page does
  not present a reusable software/content licence. RoboMentor uses only the
  attributed factual numeric specifications needed for interoperability and
  teaching; the source documents and their expressive content are not copied or
  bundled. Universal Robots and UR5 are names of their respective owner; this
  project is not endorsed by or affiliated with Universal Robots A/S.
