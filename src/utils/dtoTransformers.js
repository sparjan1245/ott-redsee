/**
 * DTO Transformers - Normalize API responses
 * Ensures consistent response format and removes sensitive data
 */

class DTOTransformers {
  /**
   * Transform movie for API response
   * @param {Object} movie - Movie document
   * @param {Object} options - Transform options
   * @returns {Object} Transformed movie
   */
  static transformMovie(movie, options = {}) {
    if (!movie) return null;

    const { includeVideoUrls = false, includeInternalFields = false } = options;

    const transformed = {
      id: movie._id || movie.id,
      title: movie.title,
      description: movie.description,
      releaseDate: movie.releaseDate,
      duration: movie.duration,
      rating: movie.rating,
      ageRating: movie.ageRating,
      language: movie.languageId || movie.language, // Support both field names
      thumbnail: movie.thumbnail,
      poster: movie.poster,
      trailer: movie.trailer,
      genres: this.transformGenres(movie.genres),
      cast: this.transformCast(movie.cast),
      director: movie.director,
      subtitles: movie.subtitles || [],
      isActive: movie.isActive,
      isFeatured: movie.isFeatured,
      views: movie.views || 0,
      watchCount: movie.watchCount || 0,
      createdAt: movie.createdAt,
      updatedAt: movie.updatedAt
    };

    // Include video URLs only if explicitly requested (for streaming endpoints)
    if (includeVideoUrls && movie.videoQualities) {
      transformed.videoQualities = movie.videoQualities;
    }

    // Include internal fields only for admin
    if (includeInternalFields) {
      transformed.metadata = movie.metadata;
    }

    return transformed;
  }

  /**
   * Transform series for API response
   * @param {Object} series - Series document
   * @param {Object} options - Transform options
   * @returns {Object} Transformed series
   */
  static transformSeries(series, options = {}) {
    if (!series) return null;

    const { includeSeasons = false, includeVideoUrls = false, includeInternalFields = false } = options;

    const transformed = {
      id: series._id || series.id,
      title: series.title,
      description: series.description,
      releaseDate: series.releaseDate,
      endDate: series.endDate,
      rating: series.rating,
      ageRating: series.ageRating,
      language: series.languageId || series.language, // Support both field names
      thumbnail: series.thumbnail,
      poster: series.poster,
      trailer: series.trailer,
      genres: this.transformGenres(series.genres),
      cast: this.transformCast(series.cast),
      director: series.director,
      isActive: series.isActive,
      isFeatured: series.isFeatured,
      views: series.views || 0,
      watchCount: series.watchCount || 0,
      createdAt: series.createdAt,
      updatedAt: series.updatedAt
    };

    // Include seasons if requested
    if (includeSeasons && series.seasons) {
      transformed.seasons = series.seasons.map(season => this.transformSeason(season));
    } else if (series.seasons) {
      // Just return count
      transformed.seasonsCount = Array.isArray(series.seasons) ? series.seasons.length : 0;
    }

    // Include internal fields only for admin
    if (includeInternalFields) {
      transformed.metadata = series.metadata;
    }

    return transformed;
  }

  /**
   * Transform season for API response
   * @param {Object} season - Season document
   * @param {Object} options - Transform options
   * @returns {Object} Transformed season
   */
  static transformSeason(season, options = {}) {
    if (!season) return null;

    const { includeEpisodes = false } = options;

    const transformed = {
      id: season._id || season.id,
      seriesId: season.series?._id || season.series,
      seasonNumber: season.seasonNumber,
      title: season.title,
      description: season.description,
      releaseDate: season.releaseDate,
      thumbnail: season.thumbnail,
      isActive: season.isActive,
      createdAt: season.createdAt,
      updatedAt: season.updatedAt
    };

    // Include episodes if requested
    if (includeEpisodes && season.episodes) {
      transformed.episodes = season.episodes.map(episode => this.transformEpisode(episode));
    } else if (season.episodes) {
      transformed.episodesCount = Array.isArray(season.episodes) ? season.episodes.length : 0;
    }

    return transformed;
  }

  /**
   * Transform episode for API response
   * @param {Object} episode - Episode document
   * @param {Object} options - Transform options
   * @returns {Object} Transformed episode
   */
  static transformEpisode(episode, options = {}) {
    if (!episode) return null;

    const { includeVideoUrls = false } = options;

    const transformed = {
      id: episode._id || episode.id,
      seriesId: episode.series?._id || episode.series,
      seasonId: episode.season?._id || episode.season,
      episodeNumber: episode.episodeNumber,
      title: episode.title,
      description: episode.description,
      duration: episode.duration,
      releaseDate: episode.releaseDate,
      thumbnail: episode.thumbnail,
      subtitles: episode.subtitles || [],
      isActive: episode.isActive,
      views: episode.views || 0,
      watchCount: episode.watchCount || 0,
      createdAt: episode.createdAt,
      updatedAt: episode.updatedAt
    };

    // Include video URLs only if explicitly requested
    if (includeVideoUrls && episode.videoQualities) {
      transformed.videoQualities = episode.videoQualities;
    }

    return transformed;
  }

  /**
   * Transform genres array
   * @param {Array} genres - Genres array (can be populated or IDs)
   * @returns {Array} Transformed genres
   */
  static transformGenres(genres) {
    if (!genres || !Array.isArray(genres)) return [];

    return genres.map(genre => {
      if (typeof genre === 'object' && genre._id) {
        // Populated genre
        return {
          id: genre._id,
          name: genre.name,
          slug: genre.slug,
          icon: genre.icon
        };
      }
      // Just ID reference
      return { id: genre };
    });
  }

  /**
   * Transform cast array
   * @param {Array} cast - Cast array (can be populated or objects)
   * @returns {Array} Transformed cast
   */
  static transformCast(cast) {
    if (!cast || !Array.isArray(cast)) return [];

    return cast.map(castMember => {
      if (typeof castMember === 'object') {
        // If it's a populated Cast document
        if (castMember._id && castMember.name) {
          return {
            castId: castMember._id,
            name: castMember.name,
            role: castMember.role,
            imageUrl: castMember.image
          };
        }
        // If it's an embedded object (legacy format)
        if (castMember.name) {
          return {
            name: castMember.name,
            role: castMember.role,
            imageUrl: castMember.image
          };
        }
      }
      // Just ID reference
      return { castId: castMember };
    });
  }

  /**
   * Transform paginated response
   * @param {Array} data - Data array
   * @param {Object} pagination - Pagination info
   * @param {Function} transformer - Transform function for each item
   * @param {Object} transformOptions - Options for transformer
   * @returns {Object} Transformed paginated response
   */
  static transformPaginated(data, pagination, transformer = null, transformOptions = {}) {
    const transformedData = transformer
      ? data.map(item => transformer(item, transformOptions))
      : data;

    return {
      success: true,
      data: transformedData,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: pagination.pages
      }
    };
  }

  /**
   * Transform single item response
   * @param {Object} item - Item to transform
   * @param {Function} transformer - Transform function
   * @param {Object} transformOptions - Options for transformer
   * @returns {Object} Transformed response
   */
  static transformSingle(item, transformer = null, transformOptions = {}) {
    if (!item) {
      return {
        success: false,
        message: 'Item not found'
      };
    }

    const transformed = transformer ? transformer(item, transformOptions) : item;

    return {
      success: true,
      data: transformed
    };
  }

  /**
   * Transform upload URL response
   * @param {Object} uploadData - Upload data from UploadService
   * @returns {Object} Standardized upload response
   */
  static transformUploadResponse(uploadData) {
    return {
      success: true,
      data: {
        uploadUrl: uploadData.uploadUrl,
        key: uploadData.key,
        publicUrl: uploadData.publicUrl,
        id: uploadData.id
      }
    };
  }
}

module.exports = DTOTransformers;

