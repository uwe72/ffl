package de.ffl.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MatchdayMailOwnerShareTextTest {

    @Test
    void ownerShareText_containsExactCountsAndRoundedPercent() {
        assertEquals("in 33 von 273 Kadern (12 %)",
            MatchdayMailTransactionService.buildOwnerShareText(33, 273));
    }

    @Test
    void ownerShareText_roundsHalfUp() {
        assertEquals("in 1 von 3 Kadern (33 %)",
            MatchdayMailTransactionService.buildOwnerShareText(1, 3));
        assertEquals("in 2 von 3 Kadern (67 %)",
            MatchdayMailTransactionService.buildOwnerShareText(2, 3));
    }

    @Test
    void ownerShareText_fullOwnership_is100Percent() {
        assertEquals("in 270 von 270 Kadern (100 %)",
            MatchdayMailTransactionService.buildOwnerShareText(270, 270));
    }

    @Test
    void ownerShareText_zeroOwners_isZeroPercent() {
        assertEquals("in 0 von 270 Kadern (0 %)",
            MatchdayMailTransactionService.buildOwnerShareText(0, 270));
    }

    @Test
    void ownerShareText_zeroTotalManagers_doesNotDivideByZero() {
        assertEquals("in 0 von 0 Kadern (0 %)",
            MatchdayMailTransactionService.buildOwnerShareText(0, 0));
    }

    @Test
    void ownerShareText_negativeOwners_isZeroPercent() {
        assertEquals("in 0 von 270 Kadern (0 %)",
            MatchdayMailTransactionService.buildOwnerShareText(-1, 270));
    }

    @Test
    void ownerShareText_negativeTotalManagers_doesNotDivideByZero() {
        assertEquals("in 0 von 0 Kadern (0 %)",
            MatchdayMailTransactionService.buildOwnerShareText(5, -3));
    }
}
