/**
 * Movie Response Transformer
 * Transforms movie documents to ensure proper response format
 * Handles backward compatibility and data normalization
 */
class MovieResponseTransformer {
  /**
   * Transform movie document for API response
   * @param {Object} movie - Movie document (can be single or array)
   * @returns {Object|Array} Transformed movie(s)
   */
  static transform(movie) {
    if (Array.isArray(movie)) {
      return movie.map(m => this.transformSingle(m));
    }
    return this.transformSingle(movie);
  }

  /**
   * Transform single movie document
   * @param {Object} movie - Movie document
   * @returns {Object} Transformed movie
   */
  static transformSingle(movie) {
    if (!movie) return null;

    // Convert to plain object if it's a Mongoose document
    const movieObj = movie.toObject ? movie.toObject() : movie;

    // Transform cast array
    const transformedCast = (movieObj.cast || []).map(castMember => {
      // Handle old format (name, role, image) - backward compatibility
      if (castMember.name && !castMember.castId) {
        return {
          name: castMember.name,
          role: castMember.role,
          imageUrl: castMember.image
        };
      }
      // If castId is populated (has name, image, etc.)
      if (castMember.castId && typeof castMember.castId === 'object') {
        return {
          castId: castMember.castId._id || castMember.castId,
          name: castMember.castId.name,
          role: castMember.role,
          imageUrl: castMember.castId.image
        };
      }
      // If castId is just an ID
      return {
        castId: castMember.castId,
        role: castMember.role
      };
    });

    // Transform language
    let language = null;
    // Handle old format (string) - backward compatibility
    if (movieObj.language && typeof movieObj.language === 'string') {
      language = movieObj.language;
    } else if (movieObj.languageId) {
      if (typeof movieObj.languageId === 'object') {
        // Populated language
        language = {
          id: movieObj.languageId._id || movieObj.languageId,
          name: movieObj.languageId.name,
          code: movieObj.languageId.code,
          nativeName: movieObj.languageId.nativeName,
          flag: movieObj.languageId.flag
        };
      } else {
        // Just ID
        language = movieObj.languageId;
      }
    }

    // Transform genres
    const transformedGenres = (movieObj.genres || []).map(genre => {
      if (typeof genre === 'object' && genre._id) {
        return {
          id: genre._id,
          name: genre.name,
          slug: genre.slug,
          icon: genre.icon
        };
      }
      return { id: genre };
    });

    // Remove internal fields from response
    const { languageId, __v, ...responseData } = movieObj;

    return {
      ...responseData,
      language: language || movieObj.language, // Support both old and new format
      genres: transformedGenres,
      cast: transformedCast
    };
  }
}

module.exports = MovieResponseTransformer;

