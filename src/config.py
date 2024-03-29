import logging
import os
from dataclasses import dataclass
from functools import lru_cache

import structlog


@dataclass
class Config:  # pylint: disable=too-many-instance-attributes
    # pylint: disable=invalid-name
    DEBUG_LEVEL: str
    STRAVA_API_CLIENT_SECRET: str
    STRAVA_API_URL: str
    STRAVA_CLIENT_ID: str
    FRONTEND_HOST_URL: str


@lru_cache
def get_config_values() -> Config:
    return Config(
        DEBUG_LEVEL="INFO",
        STRAVA_API_CLIENT_SECRET=os.environ["STRAVA_API_CLIENT_SECRET"],
        STRAVA_API_URL="https://www.strava.com/api/v3",
        STRAVA_CLIENT_ID=os.environ["STRAVA_CLIENT_ID"],
        FRONTEND_HOST_URL=os.environ["FRONTEND_HOST_URL"],
    )


def get_logger() -> logging.Logger:
    structlog.configure(
        processors=[
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.CallsiteParameterAdder(
                [
                    structlog.processors.CallsiteParameter.FILENAME,
                    structlog.processors.CallsiteParameter.FUNC_NAME,
                    structlog.processors.CallsiteParameter.LINENO,
                ],
            ),
            structlog.processors.JSONRenderer(),
        ]
    )
    logger = structlog.get_logger()
    return logger
