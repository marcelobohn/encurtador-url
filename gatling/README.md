## Gatling Load Tests

This directory contains a Maven project with [Gatling](https://gatling.io/) simulations that exercise the Fastify URL shortener API.

### Prerequisites

- Java 21 (or any JDK compatible with Gatling 3.10)
- Maven 3.8+

### Running the tests

1. Ensure the application is up and reachable (for example via `http://localhost:8080` if you are using the Docker Compose stack).
2. From this `gatling/` directory run:

   ```bash
   mvn gatling:test -DbaseUrl=http://localhost:8080
   ```

   You can override the target host with `-DbaseUrl=<url>` if needed.

3. Results will be written to `target/gatling/<simulation>-<timestamp>/index.html`.

### Notes

- The simulation creates short links, follows redirects, and reads stats to emulate a realistic workflow.
- The database will collect the test data; clean it between runs if you prefer a pristine state.
