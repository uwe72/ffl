package de.ffl.domain;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class TeamValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    void shortName_isRequired() {
        Team team = Team.builder().name("Bayer Leverkusen").shortName("").slogan("Werkself").build();

        Set<ConstraintViolation<Team>> violations = validator.validate(team);

        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("shortName"));
    }

    @Test
    void slogan_mayNotExceed22Characters() {
        Team team = Team.builder().name("Bayer Leverkusen").shortName("B04").slogan("a".repeat(23)).build();

        Set<ConstraintViolation<Team>> violations = validator.validate(team);

        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("slogan"));
    }

    @Test
    void slogan_withinLimit_isValid() {
        Team team = Team.builder().name("Bayer Leverkusen").shortName("B04").slogan("a".repeat(22)).build();

        Set<ConstraintViolation<Team>> violations = validator.validate(team);

        assertThat(violations).isEmpty();
    }
}
