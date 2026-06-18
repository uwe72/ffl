package de.ffl.service;

import de.ffl.domain.Manager;
import de.ffl.domain.User;
import de.ffl.dto.UserDto;
import de.ffl.repository.ManagerGroupRepository;
import de.ffl.repository.ManagerRankRepository;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final ManagerRepository managerRepository;
    private final ManagerRankRepository managerRankRepository;
    private final ManagerGroupRepository managerGroupRepository;

    public UserService(UserRepository userRepository,
                       ManagerRepository managerRepository,
                       ManagerRankRepository managerRankRepository,
                       ManagerGroupRepository managerGroupRepository) {
        this.userRepository = userRepository;
        this.managerRepository = managerRepository;
        this.managerRankRepository = managerRankRepository;
        this.managerGroupRepository = managerGroupRepository;
    }

    @Transactional(readOnly = true)
    public List<UserDto> findAll() {
        return userRepository.findAll().stream()
            .map(UserDto::fromEntity)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UserDto findById(Long id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return null;
        }
        List<Manager> managers = managerRepository.findAllByUserId(id);
        return UserDto.fromEntityWithManagers(user, managers);
    }

    @Transactional
    public UserDto updateUser(Long id, UserDto updateData) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return null;
        }

        if (updateData.getEmail() != null) {
            user.setEmail(updateData.getEmail());
        }
        if (updateData.getFirstName() != null) {
            user.setFirstName(updateData.getFirstName());
        }
        if (updateData.getLastName() != null) {
            user.setLastName(updateData.getLastName());
        }
        if (updateData.getStreet() != null) {
            user.setStreet(updateData.getStreet());
        }
        if (updateData.getCity() != null) {
            user.setCity(updateData.getCity());
        }
        if (updateData.getBirthday() != null && !updateData.getBirthday().isEmpty()) {
            try {
                user.setBirthday(java.time.LocalDate.parse(updateData.getBirthday()));
            } catch (Exception ignored) {
            }
        }

        User saved = userRepository.save(user);

        List<Manager> managers = managerRepository.findAllByUserId(id);
        return UserDto.fromEntityWithManagers(saved, managers);
    }

    @Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return;
        }

        managerGroupRepository.clearCreatedByForUser(id);

        List<Manager> managers = managerRepository.findAllByUserId(id);
        for (Manager manager : managers) {
            managerRankRepository.deleteByManagerId(manager.getId());
            managerRepository.deletePlayerRelationsByManagerId(manager.getId());
            managerRepository.deleteGroupRelationsByManagerId(manager.getId());
        }
        managerRepository.deleteAll(managers);

        userRepository.deleteById(id);
    }

    @Transactional
    public UserDto updateAvatar(String login, MultipartFile file) throws IOException {
        User user = userRepository.findByLogin(login).orElse(null);
        if (user == null) {
            return null;
        }
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/png") && !contentType.equals("image/webp"))) {
            throw new IllegalArgumentException("Nur JPG, PNG und WebP Bilder sind erlaubt");
        }
        if (file.getSize() > 2 * 1024 * 1024) {
            throw new IllegalArgumentException("Bild darf maximal 2 MB groß sein");
        }
        user.setAvatar(file.getBytes());
        user.setAvatarContentType(contentType);
        User saved = userRepository.save(user);
        List<Manager> managers = managerRepository.findAllByUserId(saved.getId());
        return UserDto.fromEntityWithManagers(saved, managers);
    }

    @Transactional
    public void removeAvatar(String login) {
        User user = userRepository.findByLogin(login).orElse(null);
        if (user == null) {
            return;
        }
        user.setAvatar(null);
        user.setAvatarContentType(null);
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public byte[] getAvatar(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getAvatar() == null) {
            return null;
        }
        return user.getAvatar();
    }

    @Transactional(readOnly = true)
    public String getAvatarContentType(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getAvatarContentType() == null) {
            return null;
        }
        return user.getAvatarContentType();
    }
}
