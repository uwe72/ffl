package de.ffl.service;

import de.ffl.domain.User;
import de.ffl.dto.ManagerDto;
import de.ffl.dto.UpdateManagerDetailsRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class ManagerDetailsUpdateTest extends AbstractSeasonTestBase {

    @Override
    protected boolean calculateSeasonInSetup() {
        return false;
    }

    @Autowired
    private ManagerService managerService;

    @Test
    void updateManagerDetails_updatesUserAndManager() throws Exception {
        UpdateManagerDetailsRequest request = new UpdateManagerDetailsRequest();
        request.setFirstName("Uwe");
        request.setLastName("Testmann");
        request.setDescription("Neue Beschreibung");
        request.setMailTheme("DARKMODE");

        ManagerDto updated = managerService.updateManagerDetails(managerUwe72.getId(), request);

        assertNotNull(updated);
        assertEquals("Uwe", updated.getFirstName());
        assertEquals("Testmann", updated.getLastName());
        assertEquals("Neue Beschreibung", updated.getDescription());
        assertEquals("DARKMODE", updated.getMailTheme());

        User user = userRepository.findById(managerUwe72.getUser().getId()).orElseThrow();
        assertEquals("Uwe", user.getFirstName());
        assertEquals("Testmann", user.getLastName());
    }

    @Test
    void updateManagerDetails_doesNotOverrideNullFields() throws Exception {
        UpdateManagerDetailsRequest request = new UpdateManagerDetailsRequest();

        String originalFirstName = managerUwe72.getUser().getFirstName();

        ManagerDto updated = managerService.updateManagerDetails(managerUwe72.getId(), request);

        assertEquals(originalFirstName, updated.getFirstName());
    }
}
