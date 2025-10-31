package com.example;

import io.gatling.javaapi.core.Simulation;

import java.time.Duration;
import java.util.UUID;

import static io.gatling.javaapi.core.CoreDsl.StringBody;
import static io.gatling.javaapi.core.CoreDsl.atOnceUsers;
import static io.gatling.javaapi.core.CoreDsl.exec;
import static io.gatling.javaapi.core.CoreDsl.pause;
import static io.gatling.javaapi.core.CoreDsl.repeat;
import static io.gatling.javaapi.core.CoreDsl.rampUsers;
import static io.gatling.javaapi.core.CoreDsl.scenario;
import static io.gatling.javaapi.core.CoreDsl.uniformRandomSwitch;
import static io.gatling.javaapi.http.HttpDsl.http;
import static io.gatling.javaapi.http.HttpDsl.status;

public final class LinkSimulation extends Simulation {

  private static final String BASE_URL = System.getProperty("baseUrl", "http://localhost:8080");

  private final io.gatling.javaapi.http.HttpProtocolBuilder httpProtocol =
      http.baseUrl(BASE_URL)
          .acceptHeader("application/json")
          .contentTypeHeader("application/json");

  private final io.gatling.javaapi.core.ScenarioBuilder createAndUseLink =
      scenario("Create and use short link")
          .exec(session -> {
            String id = UUID.randomUUID().toString().replace("-", "");
            return session.set("payloadId", id).set("slug", id.substring(0, 10));
          })
          .exec(
              http("create link")
                  .post("/links")
                  .body(StringBody(session -> {
                    String id = session.getString("payloadId");
                    String slug = session.getString("slug");
                    return """
                        {"url":"https://example.com/article-%s","slug":"%s"}
                        """.formatted(id, slug);
                  }))
                  .check(status().is(201)))
          .pause(Duration.ofMillis(500))
          .exec(
              http("redirect to destination")
                  .get("/#{slug}")
                  .check(status().is(302)))
          .pause(Duration.ofMillis(500))
          .exec(
              http("fetch stats")
                  .get("/links/#{slug}")
                  .check(status().is(200)))
          .pause(Duration.ofSeconds(1));

  private final io.gatling.javaapi.core.ScenarioBuilder mixedTraffic =
      scenario("Mixed traffic")
          .exec(session -> {
            String id = UUID.randomUUID().toString().replace("-", "");
            return session.set("payloadId", id).set("slug", id.substring(0, 10));
          })
          .exec(
              http("create link (auto slug)")
                  .post("/links")
                  .body(StringBody(session -> {
                    String id = session.getString("payloadId");
                    String slug = session.getString("slug");
                    return """
                        {"url":"https://example.com/auto-%s","slug":"%s"}
                        """.formatted(id, slug);
                  }))
                  .check(status().is(201)))
          .pause(Duration.ofSeconds(1))
          .exec(
              repeat(3).on(
                  exec(
                      http("redirect existing")
                          .get("/#{slug}")
                          .check(status().is(302)))
                      .pause(Duration.ofMillis(250))))
          .exec(
              uniformRandomSwitch()
                  .on(
                      exec(
                          http("get stats")
                              .get("/links/#{slug}")
                              .check(status().is(200))),
                      exec(session -> session)))
          .pause(Duration.ofSeconds(1));

  {
    setUp(
        createAndUseLink.injectOpen(
            atOnceUsers(5),
            rampUsers(45).during(Duration.ofSeconds(30)),
            rampUsers(25).during(Duration.ofSeconds(15))),
        mixedTraffic.injectOpen(
            rampUsers(50).during(Duration.ofSeconds(45))))
        .protocols(httpProtocol);
  }
}
