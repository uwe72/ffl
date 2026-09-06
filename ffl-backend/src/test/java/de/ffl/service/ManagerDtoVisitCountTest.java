package de.ffl.service;

import de.ffl.domain.User;
import de.ffl.dto.ManagerDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ManagerDtoVisitCountTest extends AbstractSeasonTestBase {

    @Override
    protected boolean calculateSeasonInSetup() {
        return false;
    }

    @Autowired
    private ManagerService managerService;

    @Test
    void findById_mapsVisitCountFromUser() {
        User user = managerUwe72.getUser();
        user.setVisitCount(7);
        userRepository.save(user);

        ManagerDto dto = managerService.findById(managerUwe72.getId());

        assertEquals(7, dto.getVisitCount().intValue());
    }

    @Test
    void findById_nullVisitCount_defaultsToZero() {
        User user = managerUwe72.getUser();
        user.setVisitCount(null);
        userRepository.save(user);

        ManagerDto dto = managerService.findById(managerUwe72.getId());

        assertEquals(0, dto.getVisitCount().intValue());
    }
}
