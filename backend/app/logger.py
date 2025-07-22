import logging
import os
from datetime import datetime


def get_logger(name: str = "app") -> logging.Logger:
    base_dir = os.path.dirname(os.path.abspath(__file__))  # 현재 파일 기준
    log_dir = os.path.abspath(os.path.join(base_dir, "logs"))

    os.makedirs(log_dir, exist_ok=True)

    # 날짜별 파일명 생성
    date_str = datetime.now().strftime("%Y-%m-%d")
    log_file = os.path.join(log_dir, f"{name}_{date_str}.log")
    error_log_file = os.path.join(log_dir, f"{name}_error_{date_str}.log")

    logger = logging.getLogger(name)  # 로거 객체 생성

    # 중복 핸들러 방지
    if not logger.hasHandlers():
        logger.setLevel(logging.INFO)  # 로깅 수준 설정 (INFO 이상만 기록)

        # 일반 로그 핸들러
        info_handler = logging.FileHandler(
            log_file, encoding="utf-8"
        )  # 파일로 출력할 핸들러 생성
        info_handler.setLevel(logging.INFO)
        info_formatter = logging.Formatter(
            fmt="%(asctime)s - %(levelname)s - %(message)s", 
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        info_handler.setFormatter(info_formatter)  # 로그 포맷 지정
        logger.addHandler(
            info_handler
        )  # 이 핸들러를 로거에 등록 (이게 있어야 출력이 됨)

        # 에러 로그 핸들러 (ERROR 이상만 기록)
        error_handler = logging.FileHandler(error_log_file, encoding="utf-8")
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(info_formatter)  # 같은 포맷 사용
        logger.addHandler(error_handler)

    return logger
