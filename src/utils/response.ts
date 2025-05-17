/**
 * Response formatting utility for consistent API responses
 *
 * This module provides a standardized way to format API responses across the application.
 * It ensures that all responses follow the same structure with success status, message, and data.
 *
 * @module utils/response
 */

/**
 * Formats a response object with a consistent structure
 *
 * @param {any} data - The data to include in the response
 * @param {string} message - A success message describing the operation result
 * @returns {Object} A formatted response object with the following structure:
 *   - success: boolean - Indicates if the operation was successful
 *   - message: string - A descriptive message about the operation
 *   - data: any - The response data payload
 *
 * @example
 * // Success response
 * formatResponse({ user: { id: 1, name: 'John' } }, 'User retrieved successfully')
 * // Returns:
 * // {
 * //   success: true,
 * //   message: 'User retrieved successfully',
 * //   data: { user: { id: 1, name: 'John' } }
 * // }
 *
 * @example
 * // Error response (typically used with error handler)
 * formatResponse(null, 'User not found')
 * // Returns:
 * // {
 * //   success: false,
 * //   message: 'User not found',
 * //   data: null
 * // }
 */
export const formatResponse = (data: any, message: string) => ({
  success: true,
  message,
  data,
});
