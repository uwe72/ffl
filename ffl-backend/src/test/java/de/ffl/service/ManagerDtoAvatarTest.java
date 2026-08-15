package de.ffl.service;

import de.ffl.domain.User;
import de.ffl.dto.ManagerDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class ManagerDtoAvatarTest extends AbstractSeasonTestBase {

    @Override
    protected boolean calculateSeasonInSetup() {
        return false;
    }

    @Autowired
    private ManagerService managerService;

    @Test
    void findById_setsAvatarUrlWhenUserHasAvatar() {
        User user = managerUwe72.getUser();
        user.setAvatar(new byte[]{1, 2, 3});
        user.setAvatarContentType("image/png");
        userRepository.save(user);

        ManagerDto dto = managerService.findById(managerUwe72.getId());

        assertNotNull(dto);
        assertEquals("/api/users/" + user.getId() + "/avatar", dto.getAvatarUrl());
    }

    @Test
    void findById_omitsAvatarUrlWhenUserHasNoAvatar() {
        User user = managerUwe72.getUser();
        user.setAvatar(null);
        user.setAvatarContentType(null);
        userRepository.save(user);

        ManagerDto dto = managerService.findById(managerUwe72.getId());

        assertNotNull(dto);
        assertNull(dto.getAvatarUrl());
    }

    @Test
    void findBySeasonId_setsAvatarUrlForManagersWithAvatar() {
        User user = managerUwe72.getUser();
        user.setAvatar(new byte[]{1, 2, 3});
        user.setAvatarContentType("image/png");
        userRepository.save(user);

        var dtos = managerService.findBySeasonId(season.getId());

        ManagerDto uweDto = dtos.stream()
            .filter(d -> d.getId().equals(managerUwe72.getId()))
            .findFirst()
            .orElseThrow();

        assertEquals("/api/users/" + user.getId() + "/avatar", uweDto.getAvatarUrl());
    }
}
