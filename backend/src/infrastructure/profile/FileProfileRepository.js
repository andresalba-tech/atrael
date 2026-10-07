const fs = require("fs");
const IProfileRepository = require("../../domain/interfaces/IProfileRepository");
const { CREATOR_PROFILE_PATH } = require("../../config/env");

class FileProfileRepository extends IProfileRepository {
  constructor(profilePath = CREATOR_PROFILE_PATH) {
    super();
    this.profilePath = profilePath;
    this.cachedProfile = null;
  }

  getProfile() {
    if (this.cachedProfile) {
      return this.cachedProfile;
    }

    console.log(`Loading creator profile from: ${this.profilePath}`);

    if (!fs.existsSync(this.profilePath)) {
      throw new Error(`creator-profile.md was not found at: ${this.profilePath}`);
    }

    const profile = fs.readFileSync(this.profilePath, "utf8").trim();

    if (!profile) {
      throw new Error("creator-profile.md exists but is empty.");
    }

    console.log(
      `Creator profile loaded successfully (${profile.length} characters).`
    );

    this.cachedProfile = profile;
    return profile;
  }
}

module.exports = FileProfileRepository;
