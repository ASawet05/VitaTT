package com.example.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

private val VitaDarkColorScheme = darkColorScheme(
    primary = VitaMintLight,
    onPrimary = Color(0xFF042F24),
    primaryContainer = VitaEmeraldCardDark,
    onPrimaryContainer = VitaMintSoft,
    secondary = VitaGoldAccent,
    onSecondary = Color(0xFF281900),
    secondaryContainer = Color(0xFF3E2C07),
    onSecondaryContainer = VitaGoldSoft,
    tertiary = VitaSkyWater,
    onTertiary = Color.White,
    background = VitaEmeraldDeepBg,
    onBackground = Color(0xFFECFDF5),
    surface = VitaEmeraldSurfaceDark,
    onSurface = Color(0xFFECFDF5),
    surfaceVariant = VitaEmeraldCardDark,
    onSurfaceVariant = Color(0xFFA7F3D0),
    error = VitaCoralHeart,
    onError = Color.White
)

private val VitaLightColorScheme = lightColorScheme(
    primary = VitaEmeraldPrimary,
    onPrimary = Color.White,
    primaryContainer = VitaMintSoft,
    onPrimaryContainer = VitaEmeraldDark,
    secondary = VitaGoldAccent,
    onSecondary = Color.White,
    secondaryContainer = VitaGoldSoft,
    onSecondaryContainer = Color(0xFF78350F),
    tertiary = VitaSkyWater,
    onTertiary = Color.White,
    background = LightBackground,
    onBackground = LightOnBackground,
    surface = LightSurface,
    onSurface = LightOnBackground,
    surfaceVariant = LightSurfaceVariant,
    onSurfaceVariant = LightOnSurfaceVariant,
    error = VitaCoralHeart,
    onError = Color.White
)

val VitaShapes = Shapes(
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(18.dp),
    large = RoundedCornerShape(24.dp),
    extraLarge = RoundedCornerShape(32.dp)
)

@Composable
fun MyApplicationTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) VitaDarkColorScheme else VitaLightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        shapes = VitaShapes,
        content = content
    )
}
