package de.ffl.service;

import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.dto.UserDto;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class UserServiceTest extends AbstractSeasonTestBase {

    @Override
    protected boolean calculateSeasonInSetup() {
        return false;
    }

    @Autowired
    private UserService userService;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAsAdmin() {
        Authentication auth = new UsernamePasswordAuthenticationToken(
            "admin", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private void authenticateAsNormal() {
        Authentication auth = new UsernamePasswordAuthenticationToken(
            "uwe72", null, List.of(new SimpleGrantedAuthority("ROLE_NORMAL")));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private UserDto loginUpdateDto(String newLogin) {
        User existing = managerUwe72.getUser();
        UserDto dto = new UserDto();
        dto.setId(existing.getId());
        dto.setLogin(newLogin);
        return dto;
    }

    @Test
    void adminCanChangeLogin() {
        authenticateAsAdmin();
        Long userId = managerUwe72.getUser().getId();
        String originalLogin = managerUwe72.getUser().getLogin();

        UserDto update = loginUpdateDto("uwe72Neu");
        UserDto result = userService.updateUser(userId, update);

        assertNotNull(result);
        assertEquals("uwe72Neu", result.getLogin());
        assertNotEquals(originalLogin, result.getLogin());
    }

    @Test
    void nonAdminCannotChangeLogin() {
        authenticateAsNormal();
        Long userId = managerUwe72.getUser().getId();
        String originalLogin = userRepository.findById(userId).orElseThrow().getLogin();

        UserDto update = loginUpdateDto("uwe72Hacked");
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
            () -> userService.updateUser(userId, update));
        assertTrue(ex.getMessage().contains("Admins"));

        String loginAfter = userRepository.findById(userId).orElseThrow().getLogin();
        assertEquals(originalLogin, loginAfter);
    }

    @Test
    void duplicateLoginRejected() {
        authenticateAsAdmin();
        Long userId = managerUwe72.getUser().getId();

        User other = User.builder()
            .login("vergeben")
            .password("$2a$10$test")
            .email("other@test.de")
            .role(UserRole.NORMAL)
            .build();
        userRepository.save(other);

        UserDto update = loginUpdateDto("vergeben");
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
            () -> userService.updateUser(userId, update));
        assertTrue(ex.getMessage().toLowerCase().contains("vergeben"));
    }

    @Test
    void unchangedLoginNoOp() {
        authenticateAsNormal();
        Long userId = managerUwe72.getUser().getId();
        String originalLogin = userRepository.findById(userId).orElseThrow().getLogin();

        UserDto update = loginUpdateDto(originalLogin);
        assertDoesNotThrow(() -> userService.updateUser(userId, update));

        String loginAfter = userRepository.findById(userId).orElseThrow().getLogin();
        assertEquals(originalLogin, loginAfter);
    }

    @Test
    void nonAdminCanUpdateOtherFieldsWithoutLogin() {
        authenticateAsNormal();
        Long userId = managerUwe72.getUser().getId();

        UserDto update = new UserDto();
        update.setId(userId);
        update.setEmail("neu@test.de");
        update.setFirstName("Uwe");

        UserDto result = userService.updateUser(userId, update);
        assertNotNull(result);
        assertEquals("neu@test.de", result.getEmail());
        assertEquals("Uwe", result.getFirstName());
    }

    @Test
    void loginTooLongRejected() {
        authenticateAsAdmin();
        Long userId = managerUwe72.getUser().getId();

        UserDto update = loginUpdateDto("a".repeat(26));
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
            () -> userService.updateUser(userId, update));
        assertTrue(ex.getMessage().contains("25"));
    }
}
